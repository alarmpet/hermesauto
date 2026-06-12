#!/usr/bin/env node
import assert from "node:assert/strict";
import { downloadAuthenticatedProviderMedia } from "../automation/providers/provider-media-download.mjs";

let requested = null;
const providerSession = {
  async getAuthCookies(urls) {
    requested = urls;
    return [
      { name: "SID", value: "secret-session" },
      { name: "HSID", value: "secret-hsid" },
    ];
  },
};

const result = await downloadAuthenticatedProviderMedia({
  providerSession,
  mediaUrl: "https://example.test/media.png",
  cookieUrls: ["https://labs.google"],
  fetchImpl: async (url, init) => {
    assert.equal(url, "https://example.test/media.png");
    assert.match(init.headers.cookie, /SID=secret-session/);
    assert.match(init.headers["user-agent"], /Hermes provider media downloader/);
    return {
      ok: true,
      status: 200,
      headers: new Map([["content-type", "image/png"]]),
      async arrayBuffer() {
        return new Uint8Array([1, 2, 3, 4]).buffer;
      },
    };
  },
});

assert.deepEqual(requested, ["https://labs.google"]);
assert.equal(result.contentType, "image/png");
assert.equal(result.buffer.length, 4);

await assert.rejects(
  () => downloadAuthenticatedProviderMedia({
    providerSession,
    mediaUrl: "https://example.test/fail.png",
    cookieUrls: ["https://labs.google"],
    fetchImpl: async () => ({ ok: false, status: 403, headers: new Map(), async arrayBuffer() { return new ArrayBuffer(0); } }),
  }),
  (error) => {
    assert.match(error.message, /HTTP 403/);
    assert.doesNotMatch(error.message, /secret-session|secret-hsid/);
    return true;
  },
);

console.log(JSON.stringify({ ok: true, checked: "provider-authenticated-download-contract" }));
