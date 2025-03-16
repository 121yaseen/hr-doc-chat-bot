"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaSpinner } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { createChat } from "@/lib/chatActions";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
};

export default function QueryPage() {
  const { user, loading: userLoading } = useUser();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [user, userLoading, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create a new chat when the user starts a conversation
  const ensureChatExists = async () => {
    if (!user) return null;

    if (!chatId) {
      try {
        const result = await createChat(user.id);
        if (result.success && result.chat) {
          setChatId(result.chat.id);
          return result.chat.id;
        } else {
          console.error("Failed to create chat:", result.error);
          return null;
        }
      } catch (error) {
        console.error("Failed to create chat:", error);
        return null;
      }
    }

    return chatId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || !user) return;

    // Ensure we have a chat to add messages to
    const currentChatId = await ensureChatExists();
    if (!currentChatId) {
      console.error("Could not create or find chat");
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: query,
    };

    // Add a loading message from the assistant
    const loadingMessage: Message = {
      role: "assistant",
      content: "",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setLoading(true);
    setQuery("");

    try {
      // Send query to API - the API will save both messages to the database
      const response = await axios.post("/api/query", {
        query: query.trim(),
        chatId: currentChatId,
      });

      // Extract the answer text, handling nested structure if present
      let answerText = response.data.answer;

      // Check if answer is an object with its own answer property
      if (
        typeof answerText === "object" &&
        answerText !== null &&
        "answer" in answerText
      ) {
        answerText = answerText.answer;
      }

      // Replace the loading message with the actual response
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the loading message
        newMessages.pop();
        // Add the actual response with the extracted answer text
        newMessages.push({
          role: "assistant",
          content: answerText,
        });
        return newMessages;
      });

      // If this is the first message, redirect to the chat page
      if (messages.length === 0) {
        router.push(`/query/${currentChatId}`);
      }
    } catch (error) {
      console.error("Query error:", error);

      // Replace the loading message with an error message
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the loading message
        newMessages.pop();
        // Add the error message
        const errorMessage =
          "Sorry, I encountered an error while processing your query. Please try again.";

        // Add the error message to the UI
        newMessages.push({
          role: "assistant",
          content: errorMessage,
        });
        return newMessages;
      });
    } finally {
      setLoading(false);
    }
  };

  // If loading authentication, show loading spinner
  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // If not authenticated, don't render anything (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">New Conversation</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-[calc(100vh-300px)] overflow-y-auto p-6 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FaSearch className="text-4xl mb-4" />
                <p className="text-center">
                  Ask a question about your HR documents to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary-100 text-primary-800 ml-auto"
                        : "bg-white border border-gray-200 mr-auto"
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex flex-col items-center space-y-2 py-4">
                        <div className="flex space-x-2">
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                        <span className="text-gray-500 text-sm">
                          Searching documents and generating answer...
                        </span>
                      </div>
                    ) : message.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSubmit} className="flex items-center">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your HR documents..."
                className="flex-grow input"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className={`ml-2 btn btn-primary ${
                  loading || !query.trim()
                    ? "opacity-70 cursor-not-allowed"
                    : ""
                }`}
              >
                {loading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaSearch />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
