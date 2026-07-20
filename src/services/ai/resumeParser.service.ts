import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { ApiError } from "../../middleware/errorHandler";

const MAX_CHARS = 6000;

export async function extractResumeText(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  let text: string;

  if (mimetype === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (
    mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    throw new ApiError(400, "Unsupported file type");
  }

  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < 50) {
    throw new ApiError(
      400,
      "Couldn't read enough text from this file — try a different file or format",
    );
  }

  return cleaned.slice(0, MAX_CHARS);
}
