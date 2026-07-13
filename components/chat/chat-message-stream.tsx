"use client";

import type { ReactNode } from "react";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { ChatMessageItem } from "./chat-message-item";
import { ChatTypingIndicator } from "./chat-typing-indicator";
import type { ChatMessage } from "@/types/chat";

type Props = {
  messages: ChatMessage[];
  myUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  isRemoteTyping?: boolean;
  fallback?: ReactNode;
};

export function ChatMessageStream({
  messages,
  myUserId,
  onReact,
  isRemoteTyping = false,
  fallback,
}: Props) {
  const hasContent = messages.length > 0 || isRemoteTyping;

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-0 px-3 py-2">
            {!hasContent && fallback ? (
              <div className="flex min-h-full flex-1">{fallback}</div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor
                  >
                    <ChatMessageItem
                      message={message}
                      myUserId={myUserId}
                      onReact={onReact}
                    />
                  </MessageScrollerItem>
                ))}
                {isRemoteTyping && (
                  <MessageScrollerItem scrollAnchor>
                    <ChatTypingIndicator />
                  </MessageScrollerItem>
                )}
              </>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
