import {
  generateNombaWebhookSignature,
  handleOptions,
  readJsonBody,
  safeCompare,
  sendJson,
} from "../../lib/nomba.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method === "GET") {
    return sendJson(res, 200, {
      success: true,
      message: "Nomba webhook endpoint is live. Nomba should send POST requests here.",
      endpoint: "/api/nomba/webhook",
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, {
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const payload = await readJsonBody(req);

    const webhookSecret = process.env.NOMBA_WEBHOOK_SECRET;
    const timestamp = req.headers["nomba-timestamp"];
    const sentSignature =
      req.headers["nomba-signature"] || req.headers["nomba-sig-value"];

    let signatureVerified = "skipped";

    if (webhookSecret) {
      const generatedSignature = generateNombaWebhookSignature(
        payload,
        webhookSecret,
        timestamp
      );

      const isValid = safeCompare(sentSignature, generatedSignature);

      if (!isValid) {
        return sendJson(res, 401, {
          success: false,
          error: "Invalid Nomba webhook signature",
        });
      }

      signatureVerified = true;
    }

    const eventType = payload.event_type;
    const requestId = payload.requestId;
    const transaction = payload?.data?.transaction || {};
    const order = payload?.data?.order || {};

    console.log("Nomba webhook received", {
      eventType,
      requestId,
      transactionId: transaction.transactionId,
      transactionAmount: transaction.transactionAmount,
      orderReference: order.orderReference,
      signatureVerified,
    });

    return sendJson(res, 200, {
      success: true,
      received: true,
      eventType,
      requestId,
      signatureVerified,
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      error: error.message || "Webhook processing failed",
    });
  }
}