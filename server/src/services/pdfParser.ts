import pdf from "pdf-parse";

export async function extractPdfText(buffer: Buffer) {
  const result = await pdf(buffer);
  return result.text;
}
