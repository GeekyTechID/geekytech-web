import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  fullscreen?: boolean
  className?: string
}

const sizeClass = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
}

export function LoadingSpinner({ size = "md", fullscreen = false, className }: LoadingSpinnerProps) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className={cn("animate-spin text-brand", sizeClass[size], className)} />
      </div>
    )
  }

  return <Loader2 className={cn("animate-spin text-brand", sizeClass[size], className)} />
}
