import { NextRequest, NextResponse } from "next/server";
import { queryDocuments } from "@/lib/documentQuery";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addMessage, getChat, updateChatTitle } from "@/lib/chatActions";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Add route segment config to mark this route as dynamic
export const dynamic = "force-dynamic";

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

    // Check if this is the first message in the chat
    if (chatId) {
      const chatResult = await getChat(chatId, userId);

      if (chatResult.success && chatResult.chat) {
        const messagesCount = chatResult.chat.messages.length;

        // If this is a new chat (no messages yet), update the title based on the query
        if (messagesCount === 0) {
          // Generate a title from the query (limit to 50 chars for display purposes)
          const title =
            query.length > 50 ? query.substring(0, 47) + "..." : query;
          await updateChatTitle(chatId, userId, title);
        }
        // If we have a few messages (5+ messages) and the title is still the first query or "New Chat",
        // generate a better title using AI
        else if (
          messagesCount >= 5 &&
          (chatResult.chat.title === "New Chat" ||
            (messagesCount > 0 &&
              chatResult.chat.messages[0].role === "user" &&
              chatResult.chat.title === chatResult.chat.messages[0].content))
        ) {
          try {
            // Get the conversation history
            const conversationHistory = chatResult.chat.messages
              .map(
                (msg) =>
                  `${msg.role === "user" ? "User" : "Assistant"}: ${
                    msg.content
                  }`
              )
              .join("\n");

            // Use Gemini to generate a concise title
            const model = genAI.getGenerativeModel({
              model: "gemini-1.5-flash",
            });
            const prompt = `Based on the following conversation, generate a concise, descriptive title (maximum 5 words) that captures the main topic or question being discussed. Don't use quotes in your response.

Conversation:
${conversationHistory}

Title:`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const generatedTitle = response.text().trim();

            // Ensure the title isn't too long
            const finalTitle =
              generatedTitle.length > 50
                ? generatedTitle.substring(0, 47) + "..."
                : generatedTitle;

            // Update the chat title
            await updateChatTitle(chatId, userId, finalTitle);
          } catch (error) {
            console.error("Error generating chat title:", error);
            // If AI title generation fails, we keep the existing title
          }
        }

        // Save the user's message to the database
        await addMessage(chatId, {
          role: "user",
          content: query,
        });
      }
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
