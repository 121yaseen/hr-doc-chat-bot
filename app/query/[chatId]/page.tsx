"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaSpinner, FaBook } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import { useUser } from "@/context/UserContext";
import { getChat } from "@/lib/chatActions";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
};

export default function ChatPage() {
  const { user, loading: userLoading } = useUser();
  const params = useParams();
  const chatId = params?.chatId as string;
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [user, userLoading, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load chat history
  useEffect(() => {
    async function loadChatHistory() {
      if (!user || !chatId) return;

      try {
        setIsLoadingHistory(true);
        const result = await getChat(chatId, user.id);

        if (result.success && result.chat && result.chat.messages) {
          const formattedMessages: Message[] = result.chat.messages.map(
            (msg) => ({
              id: msg.id,
              role: msg.role as "user" | "assistant",
              content: msg.content,
            })
          );

          setMessages(formattedMessages);
        } else if (!result.success) {
          console.error("Failed to load chat history:", result.error);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadChatHistory();
  }, [chatId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || !user || !chatId) return;

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
        chatId: chatId,
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

  if (isLoadingHistory) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 flex justify-end">
          <Link
            href="/documents"
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center"
          >
            <FaBook className="mr-2" /> Documents
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-[calc(100vh-300px)] overflow-y-auto p-6 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FaSearch className="text-4xl mb-4" />
                <p className="text-center">
                  This conversation is empty. Ask a question to get started.
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
