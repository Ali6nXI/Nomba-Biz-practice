import { handleOptions, nombaApi, sendJson } from "../../lib/nomba.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, {
      success: false,
      error: "Method not allowed. Use GET.",
    });
  }

  try {
    const requestUrl = new URL(req.url, `https://${req.headers.host}`);

    const orderReference = requestUrl.searchParams.get("orderReference");
    const transactionRef = requestUrl.searchParams.get("transactionRef");

    if (!orderReference && !transactionRef) {
      return sendJson(res, 400, {
        success: false,
        error: "Provide orderReference or transactionRef",
      });
    }

    const query = new URLSearchParams();

    if (orderReference) query.set("orderReference", orderReference);
    if (transactionRef) query.set("transactionRef", transactionRef);

    const { data } = await nombaApi(
      `/v1/transactions/accounts/single?${query.toString()}`,
      {
        method: "GET",
      }
    );

    const status = data?.data?.status || data?.description || "UNKNOWN";
    const paid = status === "SUCCESS";

    return sendJson(res, 200, {
      success: data?.code === "00",
      paid,
      status,
      transaction: data?.data || null,
      nomba: data,
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      paid: false,
      error: error.message || "Server error verifying transaction",
    });
  }
}