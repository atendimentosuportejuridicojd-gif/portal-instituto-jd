/**
 * Tag do Google Ads (gtag.js) para o portal, com Consent Mode v2.
 *
 * Carregamento e disparo de eventos acontecem só no cliente — chame
 * `initGoogleAds()` a partir de um `useEffect` (nunca durante SSR).
 */

const CONVERSION_ACCOUNT_IDS = ["AW-18055048925", "AW-18069973013"] as const;
const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${CONVERSION_ACCOUNT_IDS[0]}`;

const CONSENT_STORAGE_KEY = "jd_cookie_consent";
const CLICK_ID_STORAGE_KEY = "jd_gclid";

export type ConsentDecision = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function callGtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(args);
}

function ensureGtagStub() {
  window.dataLayer = window.dataLayer ?? [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
}

export function getStoredConsent(): ConsentDecision | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw === "granted" || raw === "denied" ? raw : null;
  } catch {
    return null;
  }
}

function setStoredConsent(decision: ConsentDecision) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, decision);
  } catch {
    // localStorage indisponível (modo privado, etc.) — segue sem persistir.
  }
}

/**
 * Mantém o gclid da URL do anúncio disponível durante a navegação do funil
 * do simulado (landing -> cadastro é troca de rota no cliente, sem reload,
 * então o parâmetro não sobrevive sozinho na URL entre as páginas).
 */
function persistClickId() {
  if (!isBrowser()) return;

  const params = new URLSearchParams(window.location.search);
  const gclidFromUrl = params.get("gclid");

  if (gclidFromUrl) {
    try {
      window.sessionStorage.setItem(CLICK_ID_STORAGE_KEY, gclidFromUrl);
    } catch {
      // sessionStorage indisponível — segue só com o valor já na URL.
    }
    return;
  }

  let storedGclid: string | null = null;
  try {
    storedGclid = window.sessionStorage.getItem(CLICK_ID_STORAGE_KEY);
  } catch {
    storedGclid = null;
  }

  if (storedGclid) {
    params.set("gclid", storedGclid);
    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", newUrl);
  }
}

let initialized = false;

/** Carrega o gtag.js, define os defaults de consentimento e configura as duas contas do Google Ads. Idempotente. */
export function initGoogleAds() {
  if (!isBrowser() || initialized) return;
  initialized = true;

  ensureGtagStub();
  persistClickId();

  callGtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  callGtag("set", "url_passthrough", true);
  callGtag("set", "ads_data_redaction", true);

  const storedConsent = getStoredConsent();
  if (storedConsent === "granted") {
    callGtag("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "granted",
    });
  }

  callGtag("js", new Date());
  for (const id of CONVERSION_ACCOUNT_IDS) callGtag("config", id);

  if (!document.querySelector(`script[src="${GTAG_SRC}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = GTAG_SRC;
    document.head.appendChild(script);
  }
}

/** Chamada pelo aviso de cookies quando o visitante decide aceitar ou recusar. */
export function updateConsent(decision: ConsentDecision) {
  if (!isBrowser()) return;
  ensureGtagStub();
  const value = decision === "granted" ? "granted" : "denied";
  callGtag("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
  setStoredConsent(decision);
}

/**
 * Dispara uma conversão do Google Ads. Só roda no cliente; o Consent Mode
 * já cuidado por `initGoogleAds`/`updateConsent` decide sozinho, dentro do
 * próprio gtag, se envia dados completos ou um ping modelado/sem cookie —
 * a chamada é a mesma nos dois casos.
 *
 * @param label `send_to` do evento, no formato `AW-XXXXXXXXX/xxxxxxxxxxxxxxxx`.
 */
export function trackConversion(label: string) {
  if (!isBrowser()) return;
  ensureGtagStub();
  callGtag("event", "conversion", { send_to: label });
}
