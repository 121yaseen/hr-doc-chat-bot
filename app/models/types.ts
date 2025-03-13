/**
 * Type definition for a PDF document
 */
export type PdfDocument = {
  id: string;
  filename: string;
  path: string;
  uploadDate: string;
  status: "processing" | "indexed" | "failed";
  size: number;
};
