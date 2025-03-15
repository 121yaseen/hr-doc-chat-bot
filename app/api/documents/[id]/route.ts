import { NextRequest, NextResponse } from "next/server";
import { deleteDocument, getDocument } from "@/lib/documentStore";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Add route segment config to mark this route as dynamic
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Check if document exists and belongs to the user
    const document = await getDocument(id);
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify document belongs to the user
    const userId = session.user.id as string;
    if (document.userId !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to delete this document" },
        { status: 403 }
      );
    }

    // Delete the document from the database
    await deleteDocument(id);

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
