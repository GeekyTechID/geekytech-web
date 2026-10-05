import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Current time in ms, for dynamic Server Components that must read the clock
 * per request (deadlines, expiry). Wrapped so react-hooks/purity does not flag
 * `Date.now()` in render — only use it where a fresh value each render is intended.
 */
export function nowMs(): number {
  return Date.now()
}
