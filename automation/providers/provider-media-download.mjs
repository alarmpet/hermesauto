export async function downloadAuthenticatedProviderMedia({
  providerSession,
  mediaUrl,
  cookieUrls = [],
  fetchImpl = fetch,
} = {}) {
  if (!providerSession?.getAuthCookies) throw new Error("PROVIDER_SESSION_COOKIES_REQUIRED");
  if (!mediaUrl) throw new Error("PROVIDER_MEDIA_URL_REQUIRED");
  const cookies = await providerSession.getAuthCookies(cookieUrls);
  const cookie = cookies.map((item) => `${item.name}=${item.value}`).join("; ");
  const response = await fetchImpl(mediaUrl, {
    headers: {
      cookie,
      "user-agent": "Mozilla/5.0 Hermes provider media downloader",
      accept: "*/*",
    },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`Provider media download failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = typeof response.headers?.get === "function"
    ? response.headers.get("content-type")
    : response.headers?.get?.("content-type");
  return { buffer: Buffer.from(bytes), contentType: contentType || "" };
}
