import { NextRequest, NextResponse } from "next/server";
import { getDocuments } from "@/lib/documentStore";

export async function GET(request: NextRequest) {
  try {
    // Get all documents from the database
    const documents = await getDocuments();

    return NextResponse.json({
      documents,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching documents" },
      { status: 500 }
    );
  }
}
