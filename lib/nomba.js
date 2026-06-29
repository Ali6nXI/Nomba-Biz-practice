export function getNombaConfig() {
  const config = {
    baseUrl: (process.env.NOMBA_BASE_URL || "https://sandbox.nomba.com").trim(),
    parentAccountId: (process.env.NOMBA_PARENT_ACCOUNT_ID || "").trim(),
    subAccountId: (process.env.NOMBA_SUB_ACCOUNT_ID || "").trim(),
    clientId: (process.env.NOMBA_CLIENT_ID || "").trim(),
    clientSecret: (process.env.NOMBA_CLIENT_SECRET || "").trim(),
    callbackUrl: (
      process.env.NOMBA_CALLBACK_URL ||
      "https://nomba-biz-practice.vercel.app/"
    ).trim(),
  };