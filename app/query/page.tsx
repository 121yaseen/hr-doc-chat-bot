"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaSpinner } from "react-icons/fa";
import Link from "next/link";

type Message = {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
};

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

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
      const response = await axios.post("/api/query", {
        query: query.trim(),
      });

      // Replace the loading message with the actual response
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove the loading message
        newMessages.pop();
        // Add the actual response
        newMessages.push({
          role: "assistant",
          content: response.data.answer,
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
        newMessages.push({
          role: "assistant",
          content:
            "Sorry, I encountered an error while processing your query. Please try again.",
        });
        return newMessages;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-primary-600 hover:text-primary-800">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold mt-4">Query Documents</h1>
          <p className="text-gray-600">
            Ask questions about your uploaded HR documents and get accurate
            answers powered by Gemini 2.0 Flash.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-96 overflow-y-auto p-6 bg-gray-50">
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
