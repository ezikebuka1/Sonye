type ChatMessage = {
  id: string;
  author: { id: string; name: string; avatar_color: string };
  text: string;
  timestamp: string; // ISO 8601
};

type ChatMessageListProps = {
  messages: ChatMessage[];
};

function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(hours / 24);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChatMessageList({ messages }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <p className="font-sans text-sm text-ink-soft italic text-center py-4">
        No messages yet.
      </p>
    );
  }

  return (
    // M1: read-only. Chat input lands in M5.
    <div className="space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} className="flex items-start gap-3">
          {/* Avatar */}
          <div
            // Avatar color is dynamic user data — inline backgroundColor is the
            // documented exception to no-inline-styles per D8.
            style={{ backgroundColor: msg.author.avatar_color }}
            className="w-8 h-8 rounded-full flex items-center justify-center font-sans font-semibold text-white text-xs shrink-0"
            aria-hidden="true"
          >
            {msg.author.name[0].toUpperCase()}
          </div>

          {/* Content */}
          <div>
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="font-sans text-sm font-medium text-ink">
                {msg.author.name}
              </span>
              <span className="font-sans text-xs text-ink-soft">·</span>
              <span className="font-sans text-xs text-ink-soft">
                {relativeTime(msg.timestamp)}
              </span>
            </div>
            <p className="font-sans text-sm text-ink leading-relaxed">{msg.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
