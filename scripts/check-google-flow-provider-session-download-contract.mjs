#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const flow = readFileSync(resolve(root, "automation/google-flow-media.mjs"), "utf8");
const session = readFileSync(resolve(root, "automation/providers/provider-browser-session.mjs"), "utf8");
const download = readFileSync(resolve(root, "automation/providers/provider-media-download.mjs"), "utf8");

assert.match(flow, /createProviderBrowserSession/, "Google Flow should construct a provider browser session");
assert.match(flow, /httpUrlToBuffer\(providerSession,\s*mediaUrl\)/, "HTTP media download should receive providerSession");
assert.match(flow, /downloadAuthenticatedProviderMedia/, "Google Flow should use the shared provider media downloader");
assert.match(download, /providerSession\.getAuthCookies/, "HTTP media download should use providerSession.getAuthCookies");
assert.doesNotMatch(flow, /httpUrlToBuffer\(context,\s*mediaUrl\)[\s\S]*?context\.cookies/, "HTTP media download should not call context.cookies directly");
assert.match(session, /redactForLog/, "provider browser session should expose redacted logging metadata");
assert.match(session, /cookies:\s*"\[redacted\]"/, "provider browser session must redact cookies from logs");

console.log(JSON.stringify({ ok: true, checked: "google-flow-provider-session-download-contract" }));
