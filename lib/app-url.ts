import "server-only";

const LOCAL_ORIGIN = "http://localhost:3000";

export function getAppOrigin(requestUrl?: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const candidate = configured || (process.env.NODE_ENV === "development" ? requestUrl || LOCAL_ORIGIN : "");
  if (!candidate) throw new Error("NEXT_PUBLIC_APP_URL måste vara konfigurerad i produktion.");
  const url = new URL(candidate);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(isLocal && url.protocol === "http:"))) throw new Error("NEXT_PUBLIC_APP_URL måste vara en säker origin.");
  return url.origin;
}

export function isAppOriginConfigured() {
  try { return Boolean(process.env.NEXT_PUBLIC_APP_URL && getAppOrigin()); }
  catch { return false; }
}
