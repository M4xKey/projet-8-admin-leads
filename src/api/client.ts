// ============================================================================
// CLIENT API — cœur pur du kit admin, réutilisable et testé sans navigateur.
// ============================================================================
// Un seul endroit qui sait parler au backend : base URL, JSON, token,
// gestion d'erreurs. Les modules auth/sites/leads ne font que le typer.
// `fetchImpl` est injectable → les tests tournent avec un faux fetch,
// sans serveur ni navigateur (même pattern que la lib du projet 7).

/** Erreur dédiée : un 401 = session expirée → l'UI déconnecte (pattern projet-4). */
export class SessionExpireeError extends Error {
  constructor() {
    super("Session expirée, reconnecte-toi.");
    this.name = "SessionExpireeError";
  }
}

/** Erreur API portant le status et le message renvoyés par le backend. */
export class ErreurApi extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ErreurApi";
    this.status = status;
    this.details = details;
  }
}

export interface OptionsAppel {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  corps?: unknown;
  token?: string | null;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

/** Base URL : Vite injecte import.meta.env ; en environnement Node (tests), on retombe sur localhost. */
export function baseUrlParDefaut(): string {
  // import.meta.env n'existe que sous Vite — les tests Node passent par le fallback.
  const env = (import.meta as { env?: Record<string, string> }).env;
  return env?.VITE_API_URL || "http://localhost:3000";
}

/**
 * Appel générique au backend.
 * - sérialise le corps en JSON,
 * - ajoute `Authorization: Bearer <token>` si fourni,
 * - 401 avec token → SessionExpireeError (l'UI sait quoi faire),
 * - autre erreur → ErreurApi(status, message du backend).
 */
export async function appelApi<T>(chemin: string, options: OptionsAppel = {}): Promise<T> {
  const { method = "GET", corps, token, fetchImpl = fetch, baseUrl = baseUrlParDefaut() } = options;

  const reponse = await fetchImpl(`${baseUrl}${chemin}`, {
    method,
    headers: {
      ...(corps !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corps !== undefined ? JSON.stringify(corps) : undefined,
  });

  // Certaines réponses n'ont pas de corps JSON (204...) : on tolère.
  const donnees = await reponse.json().catch(() => ({}));

  if (reponse.status === 401 && token) {
    throw new SessionExpireeError();
  }
  if (!reponse.ok) {
    const message =
      typeof (donnees as { message?: string }).message === "string"
        ? (donnees as { message: string }).message
        : `Erreur ${reponse.status}`;
    throw new ErreurApi(reponse.status, message, (donnees as { details?: unknown }).details);
  }

  return donnees as T;
}

/** Décode le payload d'un JWT sans le vérifier (la vérification est côté serveur). */
export function decoderPayloadJwt<T>(token: string): T | null {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64.replace(/-/g, "+").replace(/_/g, "/"))) as T;
  } catch {
    return null;
  }
}

/** Construit une query string propre en ignorant les valeurs vides. */
export function queryString(params: Record<string, string | number | undefined | "">): string {
  const paires = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== ""
  ) as [string, string | number][];
  if (paires.length === 0) return "";
  return "?" + paires.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}
