import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const path = request.nextUrl.pathname;

  const isAuthPage = path.startsWith("/login") || path === "/";
  const isApiAuth = path.startsWith("/api/auth");

  if (isApiAuth) return NextResponse.next();

  if (!token && !isAuthPage) {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }

  if (token && isAuthPage && path === "/login") {
    const role = token.role as string;
    const dest = role === "admin" ? "/admin" : "/interviewer";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (token && path === "/dashboard") {
    const role = token.role as string;
    const dest = role === "admin" ? "/admin" : "/interviewer";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
