import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { processDocument } from "@/lib/documentProcessor";
import { addDocument } from "@/lib/documentStore";
import * as types from "../../models/types";

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await mkdir(join(process.cwd(), "uploads"), { recursive: true });
  } catch (error) {
    console.error("Error creating uploads directory:", error);
  }
};

export async function POST(request: NextRequest) {
  console.log("Upload API route called");

  try {
    await ensureUploadsDir();

    const formData = await request.formData();
    console.log("Form data received");

    const files = formData.getAll("files") as File[];
    console.log(`Received ${files.length} files`);

    if (!files || files.length === 0) {
      console.log("No files were uploaded");
      return NextResponse.json(
        { error: "No files were uploaded" },
        { status: 400 }
      );
    }

    const savedFiles: types.PdfDocument[] = [];

    for (const file of files) {
      console.log(`Processing file: ${file.name}, type: ${file.type}`);

      if (file.type !== "application/pdf") {
        console.log(`File ${file.name} is not a PDF`);
        return NextResponse.json(
          { error: "Only PDF files are accepted" },
          { status: 400 }
        );
      }

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
      const fileData: types.PdfDocument = {
        id: fileId,
        filename: fileName,
        path: filePath,
        uploadDate: new Date().toISOString(),
        status: "processing",
        size: buffer.length,
      };

      // Save file metadata to database
      await addDocument(fileData);
      savedFiles.push(fileData);
      console.log(`Document metadata added for ${fileId}`);

      // Process the document in the background
      processDocument(fileData).catch((error) => {
        console.error(`Error processing document ${fileId}:`, error);
      });
    }

    console.log(`Successfully uploaded ${savedFiles.length} file(s)`);
    return NextResponse.json({
      message: `Successfully uploaded ${savedFiles.length} file(s)`,
      files: savedFiles.map((file) => ({
        id: file.id,
        filename: file.filename,
        uploadDate: file.uploadDate,
        status: file.status,
      })),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "An error occurred during file upload" },
      { status: 500 }
    );
  }
}
