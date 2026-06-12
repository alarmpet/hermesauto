import { createWebUiProviderFailure } from "./web-ui-provider-contract.mjs";
import { assertWebAgentSafeAction } from "./web-agent-safety.mjs";
import { downloadAuthenticatedProviderMedia } from "./providers/provider-media-download.mjs";
import { writeWebUiEvidence } from "./web-ui-provider-harness.mjs";
import { classifyFlowGenerationFailureText } from "./google-flow-media.mjs";

export class GoogleFlowProviderAdapter {
  constructor({ session, provider = "google-flow", webAgentInspector = null, directGenerate = null } = {}) {
    this.session = session;
    this.provider = provider;
    this.webAgentInspector = webAgentInspector;
    this.directGenerate = directGenerate;
  }

  async configureSettings() {
    return createWebUiProviderFailure({
      provider: this.provider,
      failureCode: "GOOGLE_FLOW_PROVIDER_ADAPTER_NOT_WIRED",
      message: "Google Flow provider adapter boundary exists, but direct Flow calls have not been migrated yet.",
      retryable: false,
      actionRequired: false,
    });
  }

  async verifySettings() {
    return { ok: false, provider: this.provider, failureCode: "GOOGLE_FLOW_SETTINGS_NOT_VERIFIED" };
  }

  async uploadIngredients(filePaths = []) {
    return { ok: false, provider: this.provider, uploadedCount: 0, requestedCount: filePaths.length };
  }

  async focusPrompt() {
    return { ok: false, provider: this.provider, failureCode: "GOOGLE_FLOW_PROMPT_FOCUS_NOT_WIRED" };
  }

  async fillPrompt() {
    return { ok: false, provider: this.provider, failureCode: "GOOGLE_FLOW_PROMPT_FILL_NOT_WIRED" };
  }

  async submitGeneration() {
    return { ok: false, provider: this.provider, failureCode: "GOOGLE_FLOW_SUBMIT_NOT_WIRED" };
  }

  async handleConfirmation({ action = "inspect confirmation dialog", url = "https://labs.google/fx/tools/flow" } = {}) {
    assertWebAgentSafeAction({ action, url, noSpend: true });
    return { ok: false, provider: this.provider, failureCode: "GOOGLE_FLOW_CONFIRMATION_NOT_WIRED" };
  }

  async waitForMedia() {
    return { ok: false, provider: this.provider, failureCode: "GOOGLE_FLOW_MEDIA_WAIT_NOT_WIRED" };
  }

  async getAuthCookies(urls = []) {
    if (!this.session?.getAuthCookies) return [];
    return this.session.getAuthCookies(urls);
  }

  async downloadMedia({ mediaUrl = "", fetchImpl = fetch } = {}) {
    if (!this.session?.getAuthCookies) {
      return createWebUiProviderFailure({
        provider: this.provider,
        failureCode: "GOOGLE_FLOW_PROVIDER_SESSION_REQUIRED",
        message: "Google Flow adapter media download requires a provider browser session.",
        retryable: false,
        actionRequired: false,
      });
    }
    return downloadAuthenticatedProviderMedia({
      providerSession: this.session,
      mediaUrl,
      cookieUrls: ["https://labs.google/fx/ko/tools/flow", "https://labs.google"],
      fetchImpl,
    });
  }

  async generateMedia(params = {}) {
    const { directGenerate, ...providerParams } = params;
    const generator = directGenerate || this.directGenerate;
    if (typeof generator !== "function") {
      return createWebUiProviderFailure({
        provider: this.provider,
        sceneOrder: providerParams.sceneOrder,
        failureCode: "GOOGLE_FLOW_DIRECT_GENERATOR_REQUIRED",
        message: "Google Flow adapter direct bridge requires a directGenerate function until phase migration is complete.",
        retryable: false,
        actionRequired: false,
      });
    }
    const result = await generator(providerParams);
    if (!result || typeof result !== "object") return result;
    return {
      ...result,
      providerAdapter: this.provider,
      providerAdapterMode: "direct-bridge",
    };
  }

  async writeEvidence({ jobDir = "", sceneOrder = 0, label = "screen", extra = {} } = {}) {
    if (!this.session?.page) {
      return createWebUiProviderFailure({
        provider: this.provider,
        sceneOrder,
        failureCode: "GOOGLE_FLOW_PROVIDER_SESSION_REQUIRED",
        message: "Google Flow adapter evidence capture requires a provider browser session.",
        retryable: false,
        actionRequired: false,
      });
    }
    return writeWebUiEvidence({
      page: this.session.page,
      jobDir,
      provider: this.provider,
      sceneOrder,
      label,
      extra,
    });
  }

  async classifyFailure(error = {}) {
    const flowFailure = classifyFlowGenerationFailureText(error.text || error.message || "");
    if (flowFailure) {
      return {
        ok: false,
        provider: this.provider,
        failureCode: flowFailure.code,
        reason: flowFailure.reason,
        retryable: Boolean(flowFailure.retryable),
        actionRequired: Boolean(flowFailure.actionRequired),
        message: flowFailure.userMessage || error.message || "",
      };
    }
    return {
      ok: false,
      provider: this.provider,
      failureCode: error.failureCode || error.code || "GOOGLE_FLOW_FAILURE_UNCLASSIFIED",
      message: error.message || "",
    };
  }

  async inspectWithWebAgent(options = {}) {
    if (!this.webAgentInspector) {
      return {
        type: "web-agent-observation",
        provider: this.provider,
        ok: false,
        failureCode: "WEB_AGENT_INSPECTOR_NOT_CONFIGURED",
        mediaAccepted: false,
      };
    }
    const observation = await this.webAgentInspector({ provider: this.provider, ...options });
    return { type: "web-agent-observation", mediaAccepted: false, ...(observation || {}) };
  }
}

export function createGoogleFlowProviderAdapter(options = {}) {
  return new GoogleFlowProviderAdapter(options);
}
