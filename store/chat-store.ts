// store/chat-store.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ChatSession, ChatMessage } from "@/types/chat";

type ChatState = {
  isOpen: boolean;
  activeSession: ChatSession | null;
  messages: ChatMessage[];
  unreadCount: number;
  isRemoteTyping: boolean;
};

type ChatActions = {
  setOpen: (open: boolean) => void;
  setActiveSession: (session: ChatSession | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: (by?: number) => void;
  setRemoteTyping: (typing: boolean) => void;
  reset: () => void;
};

export type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  isOpen: false,
  activeSession: null,
  messages: [],
  unreadCount: 0,
  isRemoteTyping: false,
};

export const useChatStore = create<ChatStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setOpen: (isOpen) => set({ isOpen }, false, "setOpen"),
      setActiveSession: (activeSession) => set({ activeSession }, false, "setActiveSession"),
      setMessages: (messages) => set({ messages }, false, "setMessages"),
      addMessage: (message) =>
        set((s) => ({ messages: [...s.messages, message] }), false, "addMessage"),
      updateMessage: (id, patch) =>
        set(
          (s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) }),
          false,
          "updateMessage",
        ),
      setUnreadCount: (unreadCount) => set({ unreadCount }, false, "setUnreadCount"),
      incrementUnread: (by = 1) =>
        set((s) => ({ unreadCount: s.unreadCount + by }), false, "incrementUnread"),
      setRemoteTyping: (isRemoteTyping) => set({ isRemoteTyping }, false, "setRemoteTyping"),
      reset: () => set(initialState, false, "reset"),
    }),
    { name: "chat-store" },
  ),
);

export const selectChatIsOpen = (s: ChatStore) => s.isOpen;
export const selectActiveSession = (s: ChatStore) => s.activeSession;
export const selectChatMessages = (s: ChatStore) => s.messages;
export const selectChatUnread = (s: ChatStore) => s.unreadCount;
export const selectRemoteTyping = (s: ChatStore) => s.isRemoteTyping;
