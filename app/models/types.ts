/**
 * Type definition for a PDF document
 */
export type PdfDocument = {
  id: string;
  filename: string;
  path?: string; // Optional for backward compatibility
  fileContent?: Buffer | Uint8Array; // Optional for backward compatibility
  blobUrl?: string; // URL to the file in Vercel Blob Storage
  contentType: string; // MIME type of the file (required)
  uploadDate: string;
  status: "processing" | "indexed" | "failed";
  size: number;
  userId: string; // Required for database storage
};
