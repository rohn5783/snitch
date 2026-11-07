import { type NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/errors/index";
import { logger } from "@/lib/server/logger/logger";
import { paymentService } from "@/lib/server/services/payment.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    if (!signature) {
      return NextResponse.json({ message: "Missing x-razorpay-signature header", success: false }, { status: 400 });
    }

    const result = await paymentService.handleWebhook(rawBody, signature);
    logger.info("Razorpay webhook handled successfully", { event: result.event });

    return NextResponse.json({ received: true, success: true });
  } catch (error) {
    logger.error("Razorpay webhook processing failed", error);
    return errorResponse(error);
  }
}

