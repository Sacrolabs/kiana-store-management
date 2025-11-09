import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "./lib/auth/session";

// Define protected routes that require authentication
const protectedRoutes = [
  "/stores",
  "/sales",
  "/attendance",
  "/expenses",
  "/reports",
  "/employees",
  "/admins",
  "/payments",
  "/drivers",
];

// Define public routes that don't require authentication
const publicRoutes = ["/login", "/forgot-password", "/reset-password"];

// Define API routes that need protection
const protectedApiRoutes = ["/api"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isProtectedApi = protectedApiRoutes.some(
    (route) => pathname.startsWith(route) && !pathname.includes("/auth/")
  );
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Get session token from cookie
  const sessionCookie = request.cookies.get("session");
  const token = sessionCookie?.value;

  // Verify session
  let session = null;
  if (token) {
    session = await verifySession(token);
  }

  // Redirect to login if trying to access protected route without session
  if ((isProtectedRoute || isProtectedApi) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to stores if trying to access login with valid session
  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL("/stores", request.url));
  }

  // For API routes, return 401 if not authenticated
  if (isProtectedApi && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (icons, manifest, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|manifest.json|sw.js|workbox-.*\\.js).*)",
  ],
};
