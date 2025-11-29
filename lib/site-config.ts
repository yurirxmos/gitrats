const DEFAULT_SITE_URL = "https://gitrats.rxmos.dev.br";

function normalizeBaseUrl(rawUrl: string) {
  const urlWithProtocol = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  return urlWithProtocol.replace(/\/$/, "");
}

export const SITE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL);

export function absoluteUrl(path: string = "/") {
  return new URL(path, SITE_URL).toString();
}
