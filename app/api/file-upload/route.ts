import { NextRequest, NextResponse } from "next/server";
import { extname } from "path";
import { v4 as uuidv4 } from "uuid";
import { processDocument } from "@/lib/documentProcessor";
import { addDocument, updateDocumentStatus } from "@/lib/documentStore";
import { PdfDocument } from "@/models/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";

// Add route segment config to mark this route as dynamic
export const dynamic = "force-dynamic";

// Document type definition to match documentStore.ts
// type Document = {
//   id: string;
//   filename: string;
//   path: string;
//   uploadDate: string;
//   status: "processing" | "indexed" | "failed";
//   size: number;
// };

export async function POST(request: NextRequest) {
  console.log("File upload API route called");

  try {
    // Get the user session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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

    // Check if file is PDF or DOCX
    const fileExtension = extname(file.name).toLowerCase();
    if (fileExtension !== ".pdf" && fileExtension !== ".docx") {
      return NextResponse.json(
        { error: "Only PDF and DOCX files are supported" },
        { status: 400 }
      );
    }

    const fileId = uuidv4();
    const fileName = file.name;

    // Upload file to Vercel Blob Storage
    const blob = await put(`documents/${fileId}${fileExtension}`, file, {
      access: "public",
      contentType: file.type,
    });

    console.log(`File uploaded to Blob Storage: ${blob.url}`);

    // Convert file to buffer for processing
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Store file metadata in database
    const documentData: PdfDocument = {
      id: fileId,
      filename: fileName,
      blobUrl: blob.url,
      contentType: file.type,
      uploadDate: new Date().toISOString(),
      status: "processing",
      size: buffer.length,
      userId: session.user.id as string,
      // Include fileContent for document processing
      fileContent: buffer,
    };

    // Save file metadata to database
    await addDocument(documentData);
    console.log(`Document metadata added for ${fileId}`);

    // Process the document in the background
    try {
      console.log(`Starting document processing for ${fileId}`);
      // Process document asynchronously without awaiting
      processDocument(documentData)
        .then((success) => {
          if (success) {
            console.log(
              `Document processing completed successfully for ${fileId}`
            );
          } else {
            console.log(`Document processing failed for ${fileId}`);
          }
        })
        .catch((error) => {
          console.error(`Error processing document ${fileId}:`, error);
          // Update the document status to failed if processing fails
          updateDocumentStatus(fileId, "failed").catch((statusError) => {
            console.error(
              `Error updating document status for ${fileId}:`,
              statusError
            );
          });
        });
    } catch (error) {
      console.error(`Error starting document processing ${fileId}:`, error);
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
