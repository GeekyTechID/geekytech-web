import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatSessionStatus } from "@/types/chat";

export function AdminChatStatusBadge({
  status,
  className,
}: {
  status: ChatSessionStatus;
  className?: string;
}) {
  const isOpen = status === "open";
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[10px] font-bold uppercase",
        isOpen ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {isOpen ? "Aktif" : "Selesai"}
    </Badge>
  );
}
