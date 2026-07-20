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

interface GroqJsonCallOptions {
  systemPrompt: string;
  userPrompt: string;
  maxRetries?: number;
}

/**
 * Calls Groq's chat completions API with JSON mode and retries once or twice
 * on rate limits before surfacing a friendly error. Free-tier quota is tight
 * enough that a single burst of clicks could otherwise 500 for the user.
 */
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
      const status = (err as { status?: number })?.status;

      if (status === 429 && attempt < maxRetries) {
        attempt += 1;
        await sleep(attempt * 1000);
        continue;
      }
      if (status === 429) {
        throw new ApiError(
          429,
          "The AI service is busy right now — please try again in a moment",
        );
      }
      if (err instanceof ApiError) throw err;

      console.error("Groq API error:", err);
      throw new ApiError(
        502,
        "AI service is temporarily unavailable — please try again shortly",
      );
    }
  }
}
