import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { processDocument } from "@/lib/documentProcessor";
import { addDocument, updateDocumentStatus } from "@/lib/documentStore";
import { PdfDocument } from "@/models/types";

// Document type definition to match documentStore.ts
// type Document = {
//   id: string;
//   filename: string;
//   path: string;
//   uploadDate: string;
//   status: "processing" | "indexed" | "failed";
//   size: number;
// };

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await mkdir(join(process.cwd(), "uploads"), { recursive: true });
  } catch (error) {
    console.error("Error creating uploads directory:", error);
  }
};

export async function POST(request: NextRequest) {
  console.log("File upload API route called");

  try {
    await ensureUploadsDir();

    const formData = await request.formData();
    console.log("Form data received");

    const file = formData.get("file") as File;

    if (!file) {
      console.log("No file was uploaded");
      return NextResponse.json(
        { error: "No file was uploaded" },
        { status: 400 }
      );
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}`);

    const fileId = uuidv4();
    const fileName = file.name;
    const filePath = join(process.cwd(), "uploads", `${fileId}.pdf`);
    console.log(`Saving file to: ${filePath}`);

    // Convert file to buffer and save it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    console.log(`File saved: ${filePath}`);

    // Store file metadata in database
    const documentData: PdfDocument = {
      id: fileId,
      filename: fileName,
      path: filePath,
      uploadDate: new Date().toISOString(),
      status: "processing",
      size: buffer.length,
    };

    //Save file metadata to database
    await addDocument(documentData);
    console.log(`Document metadata added for ${fileId}`);

    // Process the document in the background
    try {
      console.log(`Starting document processing for ${fileId}`);
      const success = await processDocument(documentData);
      if (success) {
        console.log(`Document processing completed successfully for ${fileId}`);
      } else {
        console.log(`Document processing failed for ${fileId}`);
      }
    } catch (error) {
      console.error(`Error processing document ${fileId}:`, error);
      // Update the document status to failed if processing fails immediately
      try {
        await updateDocumentStatus(fileId, "failed");
        console.log(`Document status updated to failed for ${fileId}`);
      } catch (statusError) {
        console.error(
          `Error updating document status for ${fileId}:`,
          statusError
        );
      }
    }

    return NextResponse.json({
      message: "File uploaded successfully and processing started",
      file: {
        id: fileId,
        filename: fileName,
        status: "processing",
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "An error occurred during file upload" },
      { status: 500 }
    );
  }
}
