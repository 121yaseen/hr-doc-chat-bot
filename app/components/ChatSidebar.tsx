"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { getUserChats, createChat, deleteChat } from "@/lib/chatActions";
import { FaPlus, FaTrash, FaSignOutAlt, FaBook } from "react-icons/fa";

// Define the Chat type locally to avoid importing from chatService
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

type Chat = {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
};

// Define a type for the API response chat
interface ApiChat {
  id: string;
  title: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ApiChatMessage[];
}

// Define a type for the API response message
interface ApiChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

// Helper function to convert API response to our Chat type
function convertToChats(chats: ApiChat[]): Chat[] {
  return chats.map((chat) => ({
    id: chat.id,
    title: chat.title || "Untitled Chat", // Provide default if null
    userId: chat.userId,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messages: Array.isArray(chat.messages)
      ? chat.messages.map((msg: ApiChatMessage) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          createdAt: msg.createdAt,
        }))
      : [],
  }));
}

export default function ChatSidebar() {
  const { user, logout, loading } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname() || "";
  const router = useRouter();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Extract the current chat ID from the pathname
  useEffect(() => {
    if (pathname.startsWith("/query/")) {
      const chatId = pathname.split("/").pop();
      if (chatId) {
        setActiveChatId(chatId);
      }
    } else {
      setActiveChatId(null);
    }
  }, [pathname]);

  // Memoize the loadChats function to use in multiple places
  const loadChats = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const result = await getUserChats(user.id);
      if (result.success && result.chats) {
        setChats(convertToChats(result.chats));
      } else {
        console.error("Failed to load chats:", result.error);
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load of chats
  useEffect(() => {
    if (user && !loading) {
      loadChats();
    }
  }, [user, loading, loadChats]);

  // Periodically refresh the chat list to get updated titles
  useEffect(() => {
    if (!user) return;

    // Set up an interval to refresh the chat list every 3 seconds
    const intervalId = setInterval(() => {
      // Only refresh if we're not already loading
      if (!isLoading) {
        // Use a silent refresh that doesn't show loading state
        const silentRefresh = async () => {
          try {
            const result = await getUserChats(user.id);
            if (result.success && result.chats) {
              setChats(convertToChats(result.chats));
            }
          } catch (error) {
            console.error("Failed to refresh chats:", error);
          }
        };

        silentRefresh();
      }
    }, 3000); // Refresh every 3 seconds

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [user, isLoading, activeChatId]); // Added activeChatId as a dependency

  // Create a new chat
  const handleNewChat = async () => {
    if (!user) return;

    try {
      const result = await createChat(user.id);
      if (result.success && result.chat) {
        router.push(`/query/${result.chat.id}`);
        // Refresh the chat list
        loadChats();
      } else {
        console.error("Failed to create new chat:", result.error);
      }
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  // Delete a chat
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) return;

    if (confirm("Are you sure you want to delete this chat?")) {
      try {
        const result = await deleteChat(chatId, user.id);
        if (result.success) {
          // Refresh the chat list
          loadChats();

          // If we're currently viewing the deleted chat, redirect to the main query page
          if (pathname.includes(chatId)) {
            router.push("/query");
          }
        } else {
          console.error("Failed to delete chat:", result.error);
        }
      } catch (error) {
        console.error("Failed to delete chat:", error);
      }
    }
  };

  // If not logged in, don't show the sidebar
  if (!user && !loading) {
    return null;
  }

  return (
    <div className="w-64 bg-gray-800 text-white h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold">HR Document Bot</h2>
        {user && (
          <p className="text-sm text-gray-400 truncate mt-1">
            {user.email || user.name}
          </p>
        )}
      </div>

      <div className="p-4 space-y-2">
        <button
          onClick={handleNewChat}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center"
        >
          <FaPlus className="mr-2" /> New Chat
        </button>

        <Link
          href="/documents"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center"
        >
          <FaBook className="mr-2" /> Manage Documents
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-center py-4 text-gray-400">Loading chats...</div>
        ) : chats.length === 0 ? (
          <div className="text-center py-4 text-gray-400">No chats yet</div>
        ) : (
          <ul className="space-y-1">
            {chats.map((chat) => (
              <li key={chat.id}>
                <Link
                  href={`/query/${chat.id}`}
                  className={`block py-2 px-3 rounded hover:bg-gray-700 flex justify-between items-center ${
                    pathname.includes(chat.id) ? "bg-gray-700" : ""
                  }`}
                >
                  <span className="truncate flex-1">{chat.title}</span>
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="text-gray-400 hover:text-red-400"
                    aria-label="Delete chat"
                  >
                    <FaTrash size={14} />
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => logout()}
          className="w-full text-gray-300 hover:text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center justify-center"
        >
          <FaSignOutAlt className="mr-2" /> Sign Out
        </button>
      </div>
    </div>
  );
}
