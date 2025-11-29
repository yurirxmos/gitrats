import { Resend } from "resend";

let cachedClient: Resend | null = null;

export function getResendClient() {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não está configurada");
  }

  cachedClient = new Resend(apiKey);
  return cachedClient;
}
