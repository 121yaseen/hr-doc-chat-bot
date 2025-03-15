import { NextRequest, NextResponse } from "next/server";
import { queryDocuments } from "@/lib/documentQuery";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { addMessage } from "@/lib/chatActions";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { query, chatId } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    // chatId is optional but if provided, should be a string
    if (chatId && typeof chatId !== "string") {
      return NextResponse.json(
        { error: "ChatId must be a string if provided" },
        { status: 400 }
      );
    }

    // Get the user ID from the session
    const userId = session.user.id as string;

    // Save the user's message to the database
    if (chatId) {
      await addMessage(chatId, {
        role: "user",
        content: query,
      });
    }

    // Query the documents
    const queryResult = await queryDocuments(query);

    // Save the assistant's response to the database
    if (chatId) {
      await addMessage(chatId, {
        role: "assistant",
        content: queryResult.answer,
      });
    }

    return NextResponse.json({
      answer: queryResult.answer,
      chatId,
      sources: queryResult.sources,
    });
  } catch (error) {
    console.error("Error in query API route:", error);
    return NextResponse.json(
      { error: "Failed to process query" },
      { status: 500 }
    );
  }
}
