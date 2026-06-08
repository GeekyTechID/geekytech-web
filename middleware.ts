import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Biteship webhook only accepts base URL — rewrite POST "/" to our handler
  if (request.method === "POST" && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/api/webhooks/biteship", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
