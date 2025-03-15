"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { getUserChats, createChat, deleteChat } from "@/lib/chatActions";
import { FaPlus, FaTrash, FaSignOutAlt, FaUpload } from "react-icons/fa";
import UploadDocumentModal from "./UploadDocumentModal";

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

// Helper function to convert API response to our Chat type
function convertToChats(chats: any[]): Chat[] {
  return chats.map((chat) => ({
    id: chat.id,
    title: chat.title || "Untitled Chat", // Provide default if null
    userId: chat.userId,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messages: Array.isArray(chat.messages)
      ? chat.messages.map((msg: any) => ({
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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const pathname = usePathname() || "";
  const router = useRouter();

  // Fetch user's chats
  useEffect(() => {
    async function loadChats() {
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
    }

    if (user && !loading) {
      loadChats();
    }
  }, [user, loading]);

  // Create a new chat
  const handleNewChat = async () => {
    if (!user) return;

    try {
      const result = await createChat(user.id);
      if (result.success && result.chat) {
        router.push(`/query/${result.chat.id}`);
        // Refresh the chat list
        const updatedResult = await getUserChats(user.id);
        if (updatedResult.success && updatedResult.chats) {
          setChats(convertToChats(updatedResult.chats));
        }
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
          const updatedResult = await getUserChats(user.id);
          if (updatedResult.success && updatedResult.chats) {
            setChats(convertToChats(updatedResult.chats));
          }

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
    <>
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

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center"
          >
            <FaUpload className="mr-2" /> Upload Document
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center py-4 text-gray-400">
              Loading chats...
            </div>
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

      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </>
  );
}
