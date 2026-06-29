import crypto from "node:crypto";

let cachedAccessToken = null;
let cachedTokenExpiryMs = 0;

export function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,nomba-signature,nomba-sig-value,nomba-signature-algorithm,nomba-signature-version,nomba-timestamp"
  );
}

export function sendJson(res, statusCode, payload) {
  setJsonHeaders(res);
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

export function handleOptions(req, res) {
  if (req.method === "OPTIONS") {
    setJsonHeaders(res);
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
}

export function getNombaConfig() {
  const config = {
    baseUrl: process.env.NOMBA_BASE_URL || "https://sandbox.nomba.com",
    parentAccountId: process.env.NOMBA_PARENT_ACCOUNT_ID,
    subAccountId: process.env.NOMBA_SUB_ACCOUNT_ID,
    clientId: process.env.NOMBA_CLIENT_ID,
    clientSecret: process.env.NOMBA_CLIENT_SECRET,
    callbackUrl:
      process.env.NOMBA_CALLBACK_URL ||
      "https://nomba-biz-practice.vercel.app/",
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Nomba environment variables: ${missing.join(", ")}`);
  }

  return config;
}

export async function readJsonBody(req) {
  if (req.body) {
    if (typeof req.body === "string") {
      return req.body ? JSON.parse(req.body) : {};
    }

    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody) return {};

  return JSON.parse(rawBody);
}

async function readResponseJson(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export async function getNombaAccessToken() {
  const config = getNombaConfig();

  const fiveMinutes = 5 * 60 * 1000;

  if (cachedAccessToken && Date.now() < cachedTokenExpiryMs - fiveMinutes) {
    return cachedAccessToken;
  }

  const response = await fetch(`${config.baseUrl}/v1/auth/token/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accountId: config.parentAccountId,
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  const payload = await readResponseJson(response);

  if (!response.ok || payload?.code !== "00" || !payload?.data?.access_token) {
    throw new Error(
      payload?.description ||
        payload?.message ||
        "Unable to authenticate with Nomba"
    );
  }

  cachedAccessToken = payload.data.access_token;
  cachedTokenExpiryMs =
    Date.parse(payload.data.expiresAt) || Date.now() + 25 * 60 * 1000;

  return cachedAccessToken;
}

export async function nombaApi(path, options = {}) {
  const config = getNombaConfig();
  const accessToken = await getNombaAccessToken();

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      accountId: config.parentAccountId,
      ...(options.headers || {}),
    },
  });

  const data = await readResponseJson(response);

  return {
    response,
    data,
    config,
  };
}

export function formatAmount(amount) {
  const numberAmount = Number(amount);

  if (!Number.isFinite(numberAmount) || numberAmount <= 0) {
    throw new Error("Invalid invoice amount");
  }

  return numberAmount.toFixed(2);
}

export function makeSafeReference(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 90);
}

export function generateNombaWebhookSignature(payload, secret, timestamp) {
  const data = payload?.data || {};
  const merchant = data.merchant || {};
  const transaction = data.transaction || {};

  let transactionResponseCode = transaction.responseCode || "";

  if (transactionResponseCode === "null") {
    transactionResponseCode = "";
  }

  const hashingPayload = [
    payload.event_type || "",
    payload.requestId || "",
    merchant.userId || "",
    merchant.walletId || "",
    transaction.transactionId || "",
    transaction.type || "",
    transaction.time || "",
    transactionResponseCode,
    timestamp || "",
  ].join(":");

  return crypto
    .createHmac("sha256", secret)
    .update(hashingPayload)
    .digest("base64");
}

export function safeCompare(a, b) {
  if (!a || !b) return false;

  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}