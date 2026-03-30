import { NextResponse } from "next/server";

export function blockDebugRouteInProduction(): NextResponse | null {
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
