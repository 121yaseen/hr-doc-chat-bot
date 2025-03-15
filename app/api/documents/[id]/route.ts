import { NextRequest, NextResponse } from "next/server";
import { deleteDocument } from "@/lib/documentStore";
import { unlink } from "fs/promises";
import { join } from "path";

// Add route segment config to mark this route as dynamic
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get document details before deletion
    const document = await deleteDocument(id);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete the physical file
    try {
      await unlink(join(process.cwd(), "uploads", `${id}.pdf`));
    } catch (fileError) {
      console.error(`Error deleting file for document ${id}:`, fileError);
      // Continue even if file deletion fails
    }

    return NextResponse.json({
      message: "Document deleted successfully",
      id,
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "An error occurred while deleting the document" },
      { status: 500 }
    );
  }
}
