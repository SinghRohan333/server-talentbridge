import { callGroqForJson } from "./groqClient";

export interface ExtractedResumeData {
  skills: string[];
  summary: string;
  experience: {
    title: string;
    company: string;
    startDate: string;
    endDate: string | null;
    description: string;
  }[];
  education: { degree: string; institution: string; year: number }[];
}

const SYSTEM_PROMPT = `You are a resume parser. Extract structured information from the resume text provided.
Respond with ONLY a JSON object (no markdown, no code fences, no commentary) matching exactly this shape:
{
  "skills": string[],
  "summary": string,
  "experience": [
    { "title": string, "company": string, "startDate": string, "endDate": string | null, "description": string }
  ],
  "education": [
    { "degree": string, "institution": string, "year": number }
  ]
}
Rules:
- skills: 5-15 concise skill names, deduplicated, no explanations.
- summary: 2-3 sentence professional summary written in third person.
- Use "" or [] for fields you cannot confidently extract.
- Never invent information not present in the text.`;

export async function extractResumeData(
  resumeText: string,
): Promise<ExtractedResumeData> {
  return callGroqForJson<ExtractedResumeData>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Resume text:\n\n${resumeText}`,
  });
}
