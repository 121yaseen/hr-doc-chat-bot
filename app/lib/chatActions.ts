"use server";

import {
  createChat as createChatDb,
  getUserChats as getUserChatsDb,
  getChat as getChatDb,
  addMessage as addMessageDb,
  deleteChat as deleteChatDb,
  updateChatTitle as updateChatTitleDb,
  Chat,
  ChatMessage,
} from "./chatService";

/**
 * Server action to create a new chat
 */
export async function createChat(userId: string, title: string = "New Chat") {
  try {
    const chat = await createChatDb(userId, title);
    return { success: true, chat };
  } catch (error) {
    console.error("Error creating chat:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Server action to get all chats for a user
 */
export async function getUserChats(userId: string) {
  try {
    const chats = await getUserChatsDb(userId);
    return { success: true, chats };
  } catch (error) {
    console.error("Error getting user chats:", error);
    return { success: false, error: (error as Error).message, chats: [] };
  }
}

/**
 * Server action to get a specific chat
 */
export async function getChat(chatId: string, userId: string) {
  try {
    const chat = await getChatDb(chatId, userId);
    return { success: true, chat };
  } catch (error) {
    console.error("Error getting chat:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Server action to add a message to a chat
 */
export async function addMessage(
  chatId: string,
  message: Omit<ChatMessage, "id" | "createdAt">
) {
  try {
    const newMessage = await addMessageDb(chatId, message);
    return { success: true, message: newMessage };
  } catch (error) {
    console.error("Error adding message:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Server action to delete a chat
 */
export async function deleteChat(chatId: string, userId: string) {
  try {
    await deleteChatDb(chatId, userId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting chat:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Server action to update a chat title
 */
export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string
) {
  try {
    const updatedChat = await updateChatTitleDb(chatId, userId, title);
    return { success: true, chat: updatedChat };
  } catch (error) {
    console.error("Error updating chat title:", error);
    return { success: false, error: (error as Error).message };
  }
}
