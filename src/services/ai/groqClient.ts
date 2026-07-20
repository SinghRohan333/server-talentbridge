import Groq from "groq-sdk";
import { env } from "../../config/env";
import { ApiError } from "../../middleware/errorHandler";

export const GROQ_MODEL = "llama-3.3-70b-versatile";

let client: Groq | null = null;

function getClient(): Groq {
  if (!env.GROQ_API_KEY) {
    throw new ApiError(500, "AI features are not configured on this server");
  }
  if (!client) client = new Groq({ apiKey: env.GROQ_API_KEY });
  return client;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  return (err as { status?: number })?.status === 429;
}

interface GroqJsonCallOptions {
  systemPrompt: string;
  userPrompt: string;
  maxRetries?: number;
}

export async function callGroqForJson<T>({
  systemPrompt,
  userPrompt,
  maxRetries = 2,
}: GroqJsonCallOptions): Promise<T> {
  const groq = getClient();
  let attempt = 0;

  while (true) {
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content)
        throw new ApiError(502, "AI service returned an empty response");
      return JSON.parse(content) as T;
    } catch (err) {
      if (isRateLimitError(err) && attempt < maxRetries) {
        attempt += 1;
        await sleep(attempt * 1000);
        continue;
      }
      if (isRateLimitError(err))
        throw new ApiError(
          429,
          "The AI service is busy right now — please try again in a moment",
        );
      if (err instanceof ApiError) throw err;
      console.error("Groq API error:", err);
      throw new ApiError(
        502,
        "AI service is temporarily unavailable — please try again shortly",
      );
    }
  }
}

interface GroqChatOptions {
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[];
  tools?: Groq.Chat.Completions.ChatCompletionTool[];
  maxRetries?: number;
}

export async function callGroqChat({
  messages,
  tools,
  maxRetries = 2,
}: GroqChatOptions): Promise<Groq.Chat.Completions.ChatCompletionMessage> {
  const groq = getClient();
  let attempt = 0;

  while (true) {
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        tools,
        tool_choice: tools ? "auto" : undefined,
        temperature: 0.4,
      });

      const message = completion.choices[0]?.message;
      if (!message)
        throw new ApiError(502, "AI service returned an empty response");
      return message;
    } catch (err) {
      if (isRateLimitError(err) && attempt < maxRetries) {
        attempt += 1;
        await sleep(attempt * 1000);
        continue;
      }
      if (isRateLimitError(err))
        throw new ApiError(
          429,
          "The AI service is busy right now — please try again in a moment",
        );
      if (err instanceof ApiError) throw err;
      console.error("Groq API error:", err);
      throw new ApiError(
        502,
        "AI service is temporarily unavailable — please try again shortly",
      );
    }
  }
}
