import Groq from "groq-sdk";
import { ObjectId } from "mongodb";
import { getDb } from "../../config/db";
import { Conversation, ConversationMessage } from "../../types/models";
import { ApiError } from "../../middleware/errorHandler";
import { callGroqChat } from "./groqClient";
import { chatTools } from "./chatTools";
import { executeTool } from "./chatToolHandlers";

const MAX_TOOL_ITERATIONS = 3;
const MAX_HISTORY_MESSAGES = 12;

function conversationsCollection() {
  return getDb().collection<Conversation>("conversations");
}

const SYSTEM_PROMPT = `You are the TalentBridge career assistant, embedded in a job board application.
You help job seekers search for jobs, understand postings, and track their applications.
You have tools to search jobs, get job details, check saved jobs, and check application status — use them
whenever the user's question needs real data rather than guessing.
Keep responses concise and conversational (2-4 sentences typically). When you mention a specific job, include
its title and company so the user can recognize it. You cannot apply to jobs or save jobs on the user's behalf —
tell them to use the Apply/Save buttons on the job's page for that.
If a question is unrelated to jobs, careers, or this platform, politely redirect the conversation back to how
you can help with their job search.`;

async function getOrCreateConversation(
  userId: string,
  conversationId?: string,
): Promise<Conversation> {
  const collection = conversationsCollection();

  if (conversationId) {
    if (!ObjectId.isValid(conversationId))
      throw new ApiError(400, "Invalid conversation id");
    const existing = await collection.findOne({
      _id: new ObjectId(conversationId),
      userId: new ObjectId(userId),
    });
    if (!existing) throw new ApiError(404, "Conversation not found");
    return existing;
  }

  const now = new Date();
  const newConversation: Conversation = {
    userId: new ObjectId(userId),
    title: "New conversation",
    messages: [],
    suggestedFollowUps: [],
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(newConversation);
  newConversation._id = result.insertedId;
  return newConversation;
}

function toGroqMessages(
  messages: ConversationMessage[],
): Groq.Chat.Completions.ChatCompletionMessageParam[] {
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);

  return recent.map((m): Groq.Chat.Completions.ChatCompletionMessageParam => {
    if (m.role === "tool" && m.toolResults && m.toolResults.length > 0) {
      return {
        role: "tool",
        tool_call_id: m.toolResults[0].callId,
        content: m.content,
      };
    }
    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      return {
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        })),
      };
    }
    return { role: m.role as "user" | "assistant", content: m.content };
  });
}

function buildFollowUps(lastToolName: string | null): string[] {
  if (lastToolName === "search_jobs") {
    return [
      "Tell me more about the first one",
      "Are there similar remote roles?",
      "What's the salary range for these?",
    ];
  }
  if (lastToolName === "get_job_details") {
    return [
      "What skills do I need for this?",
      "Show me similar jobs",
      "Have I applied to this before?",
    ];
  }
  if (lastToolName === "get_saved_jobs") {
    return [
      "Which of these pay the most?",
      "Search for more jobs like these",
      "What's my application status?",
    ];
  }
  if (lastToolName === "get_my_applications") {
    return [
      "Search for more jobs",
      "Show me my saved jobs",
      "What jobs match my skills?",
    ];
  }
  return [
    "Find jobs matching my skills",
    "Show me remote openings",
    "What have I saved?",
  ];
}

function toDisplayMessage(m: ConversationMessage) {
  return { role: m.role, content: m.content, timestamp: m.timestamp };
}

export async function sendChatMessage(
  userId: string,
  userMessage: string,
  conversationId?: string,
) {
  const conversation = await getOrCreateConversation(userId, conversationId);

  const userMsg: ConversationMessage = {
    role: "user",
    content: userMessage,
    toolCalls: null,
    toolResults: null,
    timestamp: new Date(),
  };
  const workingMessages: ConversationMessage[] = [
    ...conversation.messages,
    userMsg,
  ];

  let lastToolName: string | null = null;
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations += 1;

    const groqMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...toGroqMessages(workingMessages),
    ];

    const response = await callGroqChat({
      messages: groqMessages,
      tools: chatTools,
    });

    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCalls = response.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || "{}") as Record<
          string,
          unknown
        >,
      }));

      workingMessages.push({
        role: "assistant",
        content: response.content ?? "",
        toolCalls,
        toolResults: null,
        timestamp: new Date(),
      });

      lastToolName = toolCalls[toolCalls.length - 1].name;

      for (const tc of toolCalls) {
        const result = await executeTool(tc.name, tc.args, userId);
        workingMessages.push({
          role: "tool",
          content: JSON.stringify(result),
          toolCalls: null,
          toolResults: [{ callId: tc.id, result }],
          timestamp: new Date(),
        });
      }
      continue;
    }

    const assistantMsg: ConversationMessage = {
      role: "assistant",
      content:
        response.content ??
        "I'm not sure how to help with that — could you rephrase?",
      toolCalls: null,
      toolResults: null,
      timestamp: new Date(),
    };
    workingMessages.push(assistantMsg);

    const suggestedFollowUps = buildFollowUps(lastToolName);
    const title =
      conversation.title === "New conversation"
        ? userMessage.slice(0, 60)
        : conversation.title;

    await conversationsCollection().updateOne(
      { _id: conversation._id },
      {
        $set: {
          messages: workingMessages,
          suggestedFollowUps,
          title,
          updatedAt: new Date(),
        },
      },
    );

    return {
      conversationId: conversation._id!.toString(),
      message: toDisplayMessage(assistantMsg),
      suggestedFollowUps,
    };
  }

  throw new ApiError(
    502,
    "The assistant couldn't complete this request — please try rephrasing",
  );
}

export async function getLatestConversation(userId: string) {
  const conversation = await conversationsCollection().findOne(
    { userId: new ObjectId(userId) },
    { sort: { updatedAt: -1 } },
  );
  if (!conversation) return null;

  return {
    conversationId: conversation._id!.toString(),
    messages: conversation.messages
      .filter(
        (m) => m.role === "user" || (m.role === "assistant" && !m.toolCalls),
      )
      .map(toDisplayMessage),
    suggestedFollowUps: conversation.suggestedFollowUps,
  };
}
