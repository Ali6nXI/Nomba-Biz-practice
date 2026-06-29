import {
  formatAmount,
  getNombaConfig,
  handleOptions,
  makeSafeReference,
  nombaApi,
  readJsonBody,
  sendJson,
} from "../../lib/nomba.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(res, 405, {
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const body = await readJsonBody(req);

    const invoiceId = body.invoiceId || `INV-${Date.now()}`;
    const amount = formatAmount(body.amount);
    const config = getNombaConfig();

    const orderReference = makeSafeReference(`${invoiceId}-${Date.now()}`);

    const orderPayload = {
      order: {
        orderReference,
        amount,
        currency: "NGN",
        callbackUrl: config.callbackUrl,
        customerId: makeSafeReference(body.phone || body.customer || invoiceId),
        accountId: config.subAccountId,
        orderMetaData: {
          invoiceId: String(invoiceId),
          customer: String(body.customer || ""),
          item: String(body.item || ""),
        },
      },
    };

    const { response, data } = await nombaApi("/v1/checkout/order", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok || data?.code !== "00") {
      return sendJson(res, 400, {
        success: false,
        error:
          data?.description ||
          data?.message ||
          "Nomba checkout creation failed",
        nomba: data,
      });
    }

    return sendJson(res, 200, {
      success: true,
      checkoutLink: data.data?.checkoutLink,
      orderReference: data.data?.orderReference || orderReference,
      nomba: data.data,
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      error: error.message || "Server error creating checkout",
    });
  }
}