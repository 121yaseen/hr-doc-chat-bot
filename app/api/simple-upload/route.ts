import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await mkdir(join(process.cwd(), "uploads"), { recursive: true });
  } catch (error) {
    console.error("Error creating uploads directory:", error);
  }
};

export async function POST(request: NextRequest) {
  console.log("Simple upload API route called");

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

    const fileName = `test-${Date.now()}-${file.name}`;
    const filePath = join(process.cwd(), "uploads", fileName);
    console.log(`Saving file to: ${filePath}`);

    // Convert file to buffer and save it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    console.log(`File saved: ${filePath}`);

    return NextResponse.json({
      message: "File uploaded successfully",
      fileName: fileName,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "An error occurred during file upload" },
      { status: 500 }
    );
  }
}
