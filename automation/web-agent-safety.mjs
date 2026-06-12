const BLOCKED_ACTION_TERMS = [
  "approve",
  "approval",
  "confirm",
  "consent",
  "purchase",
  "pay",
  "payment",
  "billing",
  "credit card",
  "subscribe",
  "login",
  "sign in",
  "oauth",
  "authorize",
  "account",
  "password",
  "captcha",
  "upload",
  "delete",
  "remove",
  "승인",
  "확인",
  "동의",
  "결제",
  "계정",
  "비밀번호",
  "삭제",
];

const MONEY_OR_CREDIT_PATTERN = /(?:[$€₩]\s*\d+|\b\d+\s*(?:credits?|credit|크레딧|달러|원)\b)/i;

const DEFAULT_ALLOWED_DOMAINS = [
  "labs.google",
  "flow.google",
  "chatgpt.com",
  "gemini.google.com",
  "aistudio.google.com",
];

export function isAllowedWebAgentDomain(url = "", allowedDomains = DEFAULT_ALLOWED_DOMAINS) {
  if (!url) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export function assertWebAgentSafeAction({
  action = "",
  url = "",
  allowedDomains = DEFAULT_ALLOWED_DOMAINS,
  noSpend = true,
  allowHighImpact = false,
} = {}) {
  const normalized = String(action || "").toLowerCase();
  if (!isAllowedWebAgentDomain(url, allowedDomains)) {
    throw new Error(`WEB_AGENT_DOMAIN_NOT_ALLOWED: ${url}`);
  }
  if (!allowHighImpact) {
    const blocked = BLOCKED_ACTION_TERMS.find((term) => normalized.includes(term.toLowerCase()));
    if (blocked) {
      throw new Error(`WEB_AGENT_HIGH_IMPACT_ACTION_BLOCKED: ${blocked}`);
    }
  }
  if (noSpend && MONEY_OR_CREDIT_PATTERN.test(String(action || ""))) {
    throw new Error("WEB_AGENT_SPEND_ACTION_BLOCKED");
  }
  return true;
}

export function createWebAgentObservation({
  engine = "",
  provider = "",
  task = "",
  ok = false,
  failureCode = "",
  message = "",
  observationPath = "",
  extracted = {},
  actionPolicy = {},
} = {}) {
  return {
    type: "web-agent-observation",
    engine,
    provider,
    task,
    ok: Boolean(ok),
    failureCode,
    message,
    observationPath,
    extracted,
    actionPolicy: {
      noSpend: true,
      noHighImpactActions: true,
      ...(actionPolicy || {}),
    },
    mediaAccepted: false,
  };
}
