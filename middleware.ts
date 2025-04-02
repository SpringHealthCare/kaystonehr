import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Add paths that don't require authentication
const publicPaths = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/images",
  "/assets"
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to public paths regardless of authentication status
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check for session cookie
  const session = request.cookies.get('session')

  // If user is not authenticated and trying to access protected routes
  if (!session) {
    // If trying to access root path, allow it (the page will handle redirection)
    if (pathname === "/") {
      return NextResponse.next()
    }
    // For all other protected routes, redirect to sign-in
    return NextResponse.redirect(new URL("/auth/sign-in", request.url))
  }

  // Allow access to all other routes
  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}


