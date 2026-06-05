"use client";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

type Props = {
  onSelect: (emoji: string) => void;
};

export function EmojiReactionPicker({ onSelect }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-background px-1.5 py-1 shadow-md">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="rounded-full p-1 text-base leading-none transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`React ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
