import { NextRequest, NextResponse } from "next/server";
import { queryDocuments } from "@/lib/documentQuery";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    const answer = await queryDocuments(query);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Error in query API route:", error);
    return NextResponse.json(
      { error: "Failed to process query" },
      { status: 500 }
    );
  }
}
