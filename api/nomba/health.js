import {
  getNombaAccessToken,
  getNombaConfig,
  handleOptions,
  sendJson,
} from "../../lib/nomba.js";

function lastFour(value) {
  if (!value) return null;
  return String(value).slice(-4);
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, {
      success: false,
      error: "Method not allowed. Use GET.",
    });
  }

  try {
    const config = getNombaConfig();

    const safeConfig = {
      baseUrl: config.baseUrl,
      parentAccountIdEndsWith: lastFour(config.parentAccountId),
      subAccountIdEndsWith: lastFour(config.subAccountId),
      clientIdEndsWith: lastFour(config.clientId),
      clientSecretLength: config.clientSecret.length,
      callbackUrl: config.callbackUrl,
    };

    const token = await getNombaAccessToken();

    return sendJson(res, 200, {
      success: true,
      message: "Nomba authentication succeeded.",
      safeConfig,
      tokenReceived: Boolean(token),
      tokenPreview: token ? `${token.slice(0, 8)}...hidden` : null,
    });
  } catch (error) {
    let safeConfig = null;

    try {
      const config = getNombaConfig();

      safeConfig = {
        baseUrl: config.baseUrl,
        parentAccountIdEndsWith: lastFour(config.parentAccountId),
        subAccountIdEndsWith: lastFour(config.subAccountId),
        clientIdEndsWith: lastFour(config.clientId),
        clientSecretLength: config.clientSecret.length,
        callbackUrl: config.callbackUrl,
      };
    } catch {
      safeConfig = "Could not load config";
    }

    return sendJson(res, 500, {
      success: false,
      message: "Nomba authentication failed.",
      error: error.message,
      safeConfig,
    });
  }
}