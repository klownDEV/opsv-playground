import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-url";
export async function POST(request: Request) { await clearSession(); return NextResponse.redirect(new URL("/", getAppOrigin(request.url)), 303); }
