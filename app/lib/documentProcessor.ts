"use server";

import { updateDocumentStatus, getDocument } from "./documentStore";
import { indexDocument } from "./vectorStore";
import { PdfDocument } from "@/models/types";
import { extname } from "path";
import mammoth from "mammoth";
import * as vercelBlob from "@vercel/blob";

/**
 * Process a document by extracting text and indexing it
 */
export async function processDocument(document: PdfDocument): Promise<boolean> {
  console.log(`Starting to process document: ${document.id}`);

  try {
    // Update status to processing
    await updateDocumentStatus(document.id, "processing");

    // Determine file type and extract text accordingly
    const fileExtension = extname(document.filename).toLowerCase();
    let text = "";

    // Always prioritize using the blob URL if available
    if (document.blobUrl) {
      console.log(`Downloading document from blob URL: ${document.blobUrl}`);

      try {
        // Use Vercel Blob's get method to download the file
        const blob = await vercelBlob.head(document.blobUrl);

        if (!blob) {
          console.error(`Failed to get blob from URL: ${document.blobUrl}`);
          await updateDocumentStatus(document.id, "failed");
          return false;
        }

        // Download the file
        const response = await fetch(blob.url);
        if (!response.ok) {
          console.error(
            `Failed to download file from blob URL: ${document.blobUrl}`
          );
          await updateDocumentStatus(document.id, "failed");
          return false;
        }

        const buffer = await response.arrayBuffer();
        const fileBuffer = Buffer.from(buffer);

        console.log(
          `Successfully downloaded file from blob URL: ${document.blobUrl}`
        );
        console.log(`File size: ${fileBuffer.length} bytes`);

        if (fileExtension === ".pdf") {
          // Extract text from PDF buffer
          text = await extractTextFromPdfBuffer(fileBuffer);
        } else if (fileExtension === ".docx") {
          // Extract text from DOCX buffer
          text = await extractTextFromDocxBuffer(fileBuffer);
        } else {
          console.error(
            `Unsupported file type: ${fileExtension} for document: ${document.id}`
          );
          await updateDocumentStatus(document.id, "failed");
          return false;
        }
      } catch (error) {
        console.error(
          `Error downloading file from blob URL: ${document.blobUrl}`,
          error
        );

        // Fallback to fileContent if available
        if (document.fileContent) {
          console.log(
            `Falling back to file content for document: ${document.id}`
          );
          if (fileExtension === ".pdf") {
            text = await extractTextFromPdfBuffer(
              Buffer.from(document.fileContent)
            );
          } else if (fileExtension === ".docx") {
            text = await extractTextFromDocxBuffer(
              Buffer.from(document.fileContent)
            );
          } else {
            console.error(
              `Unsupported file type: ${fileExtension} for document: ${document.id}`
            );
            await updateDocumentStatus(document.id, "failed");
            return false;
          }
        } else {
          console.error(
            `No fallback file content available for document: ${document.id}`
          );
          await updateDocumentStatus(document.id, "failed");
          return false;
        }
      }
    }
    // Fallback to fileContent if blobUrl is not available
    else if (document.fileContent) {
      console.log(`Using file content for document: ${document.id}`);
      if (fileExtension === ".pdf") {
        text = await extractTextFromPdfBuffer(
          Buffer.from(document.fileContent)
        );
      } else if (fileExtension === ".docx") {
        text = await extractTextFromDocxBuffer(
          Buffer.from(document.fileContent)
        );
      } else {
        console.error(
          `Unsupported file type: ${fileExtension} for document: ${document.id}`
        );
        await updateDocumentStatus(document.id, "failed");
        return false;
      }
    } else {
      console.error(
        `No file content or blob URL available for document: ${document.id}`
      );
      await updateDocumentStatus(document.id, "failed");
      return false;
    }

    // Check if text was successfully extracted
    if (!text || text.trim() === "") {
      console.error(`Failed to extract text from document: ${document.id}`);
      await updateDocumentStatus(document.id, "failed");
      return false;
    }

    console.log(
      `Successfully extracted ${text.length} characters from document: ${document.id}`
    );

    // Index the document
    try {
      await indexDocument({
        id: document.id,
        documentId: document.id,
        text: text,
        metadata: {
          filename: document.filename,
          chunkIndex: 0,
          totalChunks: 1,
        },
      });
      console.log(`Successfully indexed document: ${document.id}`);
    } catch (indexError) {
      console.error(`Failed to index document: ${document.id}`, indexError);
      await updateDocumentStatus(document.id, "failed");
      return false;
    }

    // Update status to indexed
    await updateDocumentStatus(document.id, "indexed");
    console.log(`Successfully processed document: ${document.id}`);
    return true;
  } catch (error) {
    console.error(`Error processing document: ${document.id}`, error);
    await updateDocumentStatus(document.id, "failed");
    return false;
  }
}

/**
 * Extract text from a PDF buffer using pdf-parse
 */
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    console.log(`Attempting to extract text from PDF buffer using pdf-parse`);

    // Dynamically import pdf-parse to avoid build issues
    const pdfParse = (await import("pdf-parse")).default;

    // Create a modified version of the PDF buffer with a valid PDF header
    // This helps pdf-parse process the file without trying to access test files
    const pdfHeader = "%PDF-1.5\n";
    const modifiedBuffer = Buffer.concat([
      Buffer.from(pdfHeader),
      buffer.slice(buffer.indexOf("%PDF") >= 0 ? buffer.indexOf("%PDF") : 0),
    ]);

    // Use pdf-parse with minimal options
    const data = await pdfParse(modifiedBuffer, {
      max: 0, // Parse all pages
    });

    // Get the text content
    const textContent = data.text;

    if (textContent && textContent.trim().length > 0) {
      console.log(
        `Successfully extracted ${textContent.length} characters from PDF`
      );
      return textContent;
    }

    throw new Error("Failed to extract text from PDF buffer");
  } catch (error) {
    console.error(`Error extracting text from PDF buffer:`, error);

    // Fallback to basic extraction if pdf-parse fails
    console.log("Falling back to basic text extraction method");
    try {
      const text = buffer.toString("utf-8");
      const basicTextContent = text.replace(/[^\x20-\x7E\n]/g, " ").trim();

      if (basicTextContent.length > 0) {
        console.log(
          `Successfully extracted ${basicTextContent.length} characters using fallback method`
        );
        return basicTextContent;
      }
    } catch (fallbackError) {
      console.error("Fallback extraction also failed:", fallbackError);
    }

    throw error;
  }
}

/**
 * Extract text from a DOCX buffer
 */
async function extractTextFromDocxBuffer(buffer: Buffer): Promise<string> {
  try {
    console.log(`Attempting to extract text from DOCX buffer`);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    if (text && text.trim() !== "") {
      console.log(`Successfully extracted ${text.length} characters from DOCX`);
      return text;
    }

    throw new Error("Failed to extract text from DOCX buffer");
  } catch (error) {
    console.error(`Error extracting text from DOCX buffer:`, error);
    throw error;
  }
}

/**
 * Reprocess a document
 */
export async function reprocessDocument(documentId: string): Promise<boolean> {
  console.log(`Reprocessing document: ${documentId}`);

  try {
    const document = await getDocument(documentId);

    if (!document) {
      console.error(`Document not found for reprocessing: ${documentId}`);
      return false;
    }

    return await processDocument(document);
  } catch (error) {
    console.error(`Error reprocessing document ${documentId}:`, error);
    return false;
  }
}
