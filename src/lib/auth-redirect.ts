import { NextResponse } from "next/server";

export function authRedirect(path: "/library" | "/sign-in?error=expired") {
  // A relative Location keeps cookies and navigation on the browser's actual
  // host, even when Next's internal request URL uses a container bind address.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "private, no-store" },
  });
}
