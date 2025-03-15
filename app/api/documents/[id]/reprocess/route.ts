import { NextRequest, NextResponse } from "next/server";
import { getDocument, updateDocumentStatus } from "@/lib/documentStore";
import { reprocessDocument } from "@/lib/documentProcessor";

// Add route segment config to mark this route as dynamic
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Check if document exists
    const document = await getDocument(id);
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update status to processing
    await updateDocumentStatus(id, "processing");

    // Start processing in the background
    reprocessDocument(id).catch((error) => {
      console.error(`Error reprocessing document ${id}:`, error);
      updateDocumentStatus(id, "failed").catch(console.error);
    });

    return NextResponse.json({ message: "Reprocessing started" });
  } catch (error) {
    console.error("Error in reprocess API:", error);
    return NextResponse.json(
      { error: "Failed to reprocess document" },
      { status: 500 }
    );
  }
}
