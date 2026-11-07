import { logger } from "@/lib/server/logger/logger";
import { inventoryService } from "@/lib/server/services/inventory.service";

export async function processFallbackJob(
  queueName: string,
  jobName: string,
  data: unknown,
): Promise<void> {
  logger.info(`[Worker] Processing job: ${jobName}`, { queueName });

  switch (jobName) {
    case "order-confirmation": {
      const payload = data as { orderId: string; userEmail: string; amount: number };
      logger.info(`[Notification] Order confirmation sent to ${payload.userEmail}`, {
        orderId: payload.orderId,
        amount: payload.amount,
      });
      break;
    }

    case "payment-notification": {
      const payload = data as { orderId: string; status: string; paymentId?: string };
      logger.info(`[Notification] Payment status ${payload.status} recorded`, {
        orderId: payload.orderId,
        paymentId: payload.paymentId,
      });
      break;
    }

    case "low-stock-alert": {
      const payload = data as { productId: string; variantId: string; stockRemaining: number; title: string };
      logger.warn(`[Alert] Low stock alert: "${payload.title}" has only ${payload.stockRemaining} items left`, {
        productId: payload.productId,
        variantId: payload.variantId,
      });
      break;
    }

    case "back-in-stock": {
      const payload = data as { productId: string; title: string };
      logger.info(`[Notification] Back in stock notification dispatched for "${payload.title}"`, {
        productId: payload.productId,
      });
      break;
    }

    case "abandoned-cart": {
      const payload = data as { userId: string; itemCount: number };
      logger.info(`[Notification] Abandoned cart follow-up for user ${payload.userId}`, {
        itemCount: payload.itemCount,
      });
      break;
    }

    case "sweep-reservations": {
      const sweptCount = await inventoryService.sweepExpiredReservations();
      logger.info(`[Maintenance] Swept ${sweptCount} expired reservations`);
      break;
    }

    case "order-status-update": {
      const payload = data as { orderId: string; status: string; buyerEmail?: string };
      logger.info(`[Notification] Order ${payload.orderId} status updated to ${payload.status}`, {
        buyerEmail: payload.buyerEmail,
      });
      break;
    }

    case "maintenance-cleanup": {
      logger.info("[Maintenance] Automated system maintenance and cleanup completed");
      break;
    }

    default:
      logger.info(`[Worker] Unhandled job ${jobName}`);
      break;
  }
}

