export function createProviderBrowserSession({ context, page, provider = "" } = {}) {
  if (!context) throw new Error("PROVIDER_BROWSER_CONTEXT_REQUIRED");
  if (!page) throw new Error("PROVIDER_BROWSER_PAGE_REQUIRED");
  return {
    provider,
    context,
    page,
    async getAuthCookies(urls = []) {
      const cookies = await context.cookies(urls);
      return cookies.map((cookie) => ({ ...cookie }));
    },
    redactForLog() {
      return {
        provider,
        hasContext: Boolean(context),
        hasPage: Boolean(page),
        cookies: "[redacted]",
      };
    },
  };
}
