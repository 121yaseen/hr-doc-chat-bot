import { prisma } from "./prisma";
import { Message as PrismaMessage } from "@prisma/client";

export type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
};

export type Chat = {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
};

// Create a new chat for a user
export async function createChat(userId: string, title: string = "New Chat") {
  return prisma.chat.create({
    data: {
      title,
      user: {
        connect: { id: userId },
      },
    },
  });
}

// Get all chats for a user
export async function getUserChats(userId: string) {
  return prisma.chat.findMany({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

// Get a specific chat with messages
export async function getChat(chatId: string, userId: string) {
  return prisma.chat.findFirst({
    where: {
      id: chatId,
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

// Add a message to a chat
export async function addMessage(
  chatId: string,
  message: Omit<ChatMessage, "id" | "createdAt">
) {
  // Update the chat's updatedAt timestamp
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  // Add the message
  return prisma.message.create({
    data: {
      role: message.role,
      content: message.content,
      chat: {
        connect: { id: chatId },
      },
    },
  });
}

// Delete a chat and all its messages
export async function deleteChat(chatId: string, userId: string) {
  // First check if the chat belongs to the user
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId,
    },
  });

  if (!chat) {
    throw new Error("Chat not found or not authorized");
  }

  // Delete the chat (messages will be cascade deleted)
  return prisma.chat.delete({
    where: {
      id: chatId,
    },
  });
}

// Update chat title
export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string
) {
  return prisma.chat.update({
    where: {
      id: chatId,
      userId,
    },
    data: {
      title,
    },
  });
}

// Convert Prisma message to ChatMessage
export function prismaMessageToChatMessage(
  message: PrismaMessage
): ChatMessage {
  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    content: message.content,
    createdAt: message.createdAt,
  };
}
