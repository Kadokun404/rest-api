import { NextResponse } from "next/server";

export function middleware(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const accept = (request.headers.get("accept") || "").toLowerCase();
  const pathname = request.nextUrl.pathname;

  // Jika diakses menggunakan cURL / Wget / HTTP client CLI pada root "/"
  if (
    pathname === "/" &&
    (ua.includes("curl") ||
      ua.includes("wget") ||
      ua.includes("httpie") ||
      (!ua.includes("mozilla") && accept.includes("text/plain")))
  ) {
    return new NextResponse("selamat datang di arashi api :v buka di web https://kadokunn.com buat liat endpoint yang awuwu\n", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store, no-cache, must-revalidate"
      }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"]
};
