import type { NextRequest } from "next/server";
import { finishGoogleOAuth } from "@/lib/server/auth-api";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return finishGoogleOAuth(request);
}
