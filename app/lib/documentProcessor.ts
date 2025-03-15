"use server";

import { updateDocumentStatus, getDocument } from "./documentStore";
import { indexDocument } from "./vectorStore";
import { readFile } from "fs/promises";
import { PdfDocument } from "@/models/types";
import { join, extname } from "path";
import { PythonShell } from "python-shell";
import mammoth from "mammoth";

/**
 * Process a document by extracting text and indexing it
 */
export async function processDocument(document: PdfDocument): Promise<boolean> {
  console.log(`Starting to process document: ${document.id}`);

  try {
    // Update status to processing
    await updateDocumentStatus(document.id, "processing");

    // Determine file type and extract text accordingly
    const fileExtension = extname(document.path).toLowerCase();
    let text = "";

    if (fileExtension === ".pdf") {
      // Extract text from PDF
      text = await extractTextFromPdfWithPlumber(document.path);
    } else if (fileExtension === ".docx") {
      // Extract text from DOCX
      text = await extractTextFromDocx(document.path);
    } else {
      console.error(
        `Unsupported file type: ${fileExtension} for document: ${document.id}`
      );
      await updateDocumentStatus(document.id, "failed");
      return false;
    }

    console.log(`Extracted text from document: ${document.id}`, text);
    if (!text || text.trim().length === 0) {
      console.error(`No text could be extracted from document: ${document.id}`);
      await updateDocumentStatus(document.id, "failed");
      return false;
    }

    console.log(
      `Successfully extracted ${text.length} characters from document: ${document.id}`
    );

    // Index the full document text
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

    // Update status to indexed
    await updateDocumentStatus(document.id, "indexed");
    console.log(`Successfully processed and indexed document: ${document.id}`);
    return true;
  } catch (error) {
    console.error(`Error processing document ${document.id}:`, error);
    try {
      await updateDocumentStatus(document.id, "failed");
    } catch (updateError) {
      console.error(
        `Error updating document status for ${document.id}:`,
        updateError
      );
    }
    return false;
  }
}

/**
 * Extract text from a PDF file using pdfplumber via Python
 */
async function extractTextFromPdfWithPlumber(
  filePath: string
): Promise<string> {
  try {
    console.log(
      `Attempting to extract text from PDF with pdfplumber: ${filePath}`
    );

    // Set up Python shell options
    const options = {
      mode: "json" as const,
      pythonPath: join(process.cwd(), "pdf_env/bin/python"),
      scriptPath: join(process.cwd(), "scripts"),
      args: [filePath],
    };

    // Run the Python script
    const results = await PythonShell.run("extract_pdf_text.py", options);

    // Parse the result
    if (results && results.length > 0) {
      const result = results[0];

      if (result.success) {
        console.log(
          `Successfully extracted ${result.text.length} characters from PDF`
        );
        return result.text;
      } else {
        console.error("Error in Python PDF extraction:", result.error);
        console.error("Traceback:", result.traceback);
        throw new Error(`Python PDF extraction failed: ${result.error}`);
      }
    }

    throw new Error("No results returned from Python PDF extraction");
  } catch (error) {
    console.error(`Error extracting text from PDF with pdfplumber:`, error);

    // Fallback to a simple extraction method if Python fails
    try {
      console.log("Attempting fallback extraction method...");
      const dataBuffer = await readFile(filePath);
      const text = dataBuffer.toString("utf-8");
      const textContent = text.replace(/[^\x20-\x7E\n]/g, " ").trim();

      if (textContent.length > 0) {
        return textContent;
      }
    } catch (fallbackError) {
      console.error("Fallback extraction also failed:", fallbackError);
    }

    throw error;
  }
}

/**
 * Extract text from a DOCX file using mammoth
 */
async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    console.log(`Attempting to extract text from DOCX: ${filePath}`);

    // Read the file
    const buffer = await readFile(filePath);

    // Extract text using mammoth
    const result = await mammoth.extractRawText({ buffer });

    if (result && result.value) {
      console.log(
        `Successfully extracted ${result.value.length} characters from DOCX`
      );
      return result.value;
    }

    throw new Error("Failed to extract text from DOCX");
  } catch (error) {
    console.error(`Error extracting text from DOCX:`, error);
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
