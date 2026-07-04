import firebase from "firebase/compat/app";
import { auth, firestore, functions } from "../firebase";
export const editChatMessage = (chatId: string, messageId: string, text: string) => functions.httpsCallable("editChatMessage")({ chatId, messageId, text });
export const deleteChatMessage = (chatId: string, messageId: string) => functions.httpsCallable("deleteChatMessage")({ chatId, messageId });
export const reactToChatMessage = (chatId: string, messageId: string, emoji: string) => functions.httpsCallable("reactToChatMessage")({ chatId, messageId, emoji });
export const markChatRead = (chatId: string) => functions.httpsCallable("markChatRead")({ chatId });
export async function sendChatMessage(input: { chatId: string; recipientId: string; text: string; replyTo?: unknown; attachment?: unknown; location?: unknown }) {
  try { return await functions.httpsCallable("sendChatMessage")(input); }
  catch (error: any) {
    if (!String(error?.code || error?.message || "").includes("not-found")) throw error;
    const uid = auth.currentUser?.uid; if (!uid) throw error;
    const chatRef = firestore.collection("Chats").doc(input.chatId); const messageRef = chatRef.collection("Messages").doc(); const timestamp = firebase.firestore.FieldValue.serverTimestamp(); const batch = firestore.batch();
    batch.set(messageRef, { text: input.text.trim().slice(0, 1000), senderId: uid, createdAt: timestamp, readBy: [uid], ...(input.replyTo ? { replyTo: input.replyTo } : {}), ...(input.attachment ? { attachment: input.attachment } : {}), ...(input.location ? { location: input.location } : {}) });
    batch.set(chatRef, { participants: [uid, input.recipientId].sort(), lastMessage: input.text.trim().slice(0, 1000), lastMessageAt: timestamp, updatedAt: timestamp, unreadFor: firebase.firestore.FieldValue.arrayUnion(input.recipientId) }, { merge: true });
    await batch.commit(); return { data: { id: messageRef.id, fallback: true } } as any;
  }
}
