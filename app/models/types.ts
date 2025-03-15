/**
 * Type definition for a PDF document
 */
export type PdfDocument = {
  id: string;
  filename: string;
  path?: string; // Optional for database storage
  fileContent?: Buffer | Uint8Array; // File content for database storage
  contentType: string; // MIME type of the file (required)
  uploadDate: string;
  status: "processing" | "indexed" | "failed";
  size: number;
  userId: string; // Required for database storage
};
