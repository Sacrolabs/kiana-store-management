import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

// Session duration: 1 hour for normal, 30 days for remember me
const SESSION_DURATION = 60 * 60; // 1 hour in seconds
const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

export type SessionData = {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
};

/**
 * Create a JWT session token
 */
export async function createSession(
  data: SessionData,
  rememberMe: boolean = false
): Promise<string> {
  const duration = rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION;

  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + duration)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a JWT session token
 */
export async function verifySession(
  token: string
): Promise<SessionData | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as SessionData;
  } catch (error) {
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(
  token: string,
  rememberMe: boolean = false
) {
  const cookieStore = await cookies();
  const maxAge = rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

/**
 * Get session from cookie
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

/**
 * Delete session cookie
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "ADMIN";
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * Require admin role (throws if not admin)
 */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();

  if (session.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }

  return session;
}
