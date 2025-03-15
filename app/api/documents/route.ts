import { NextResponse } from "next/server";
import { getDocuments } from "@/lib/documentStore";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
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

    // Get all documents from the database
    const allDocuments = await getDocuments();

    // Filter documents by user ID
    const userId = session.user.id as string;
    const userDocuments = allDocuments.filter(
      (doc) =>
        // Include documents with matching userId or documents without userId (for backward compatibility)
        doc.userId === userId || !doc.userId
    );

    return NextResponse.json({
      documents: userDocuments,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching documents" },
      { status: 500 }
    );
  }
}
