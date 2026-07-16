// Tests du cœur API — exécutés avec node:test et un fetch injecté :
// pas de navigateur, pas de serveur, pas de dépendance.
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  appelApi,
  queryString,
  decoderPayloadJwt,
  SessionExpireeError,
  ErreurApi,
} from "../src/api/client.ts";
import { login, listerLeads, creerSite, marquerLu } from "../src/api/endpoints.ts";

// --- Faux fetch : enregistre l'appel et rend une réponse programmée ----------
function fauxFetch(status: number, corps: unknown) {
  const appels: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    appels.push({ url: String(url), init: init ?? {} });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => corps,
    } as Response;
  }) as typeof fetch;
  return { impl, appels };
}

const BASE = { baseUrl: "http://api.test" };

// ============================== appelApi =====================================
test("appelApi : GET simple, retourne le JSON", async () => {
  const { impl, appels } = fauxFetch(200, { statut: "ok" });
  const resultat = await appelApi<{ statut: string }>("/sante", { ...BASE, fetchImpl: impl });
  assert.deepEqual(resultat, { statut: "ok" });
  assert.equal(appels[0].url, "http://api.test/sante");
  assert.equal(appels[0].init.method, "GET");
});

test("appelApi : POST sérialise le corps et pose Content-Type", async () => {
  const { impl, appels } = fauxFetch(201, { id: 1 });
  await appelApi("/sites", { ...BASE, fetchImpl: impl, method: "POST", corps: { nom: "X" } });
  assert.equal(appels[0].init.body, JSON.stringify({ nom: "X" }));
  const entetes = appels[0].init.headers as Record<string, string>;
  assert.equal(entetes["Content-Type"], "application/json");
});

test("appelApi : le token part en Authorization Bearer", async () => {
  const { impl, appels } = fauxFetch(200, []);
  await appelApi("/leads", { ...BASE, fetchImpl: impl, token: "abc123" });
  const entetes = appels[0].init.headers as Record<string, string>;
  assert.equal(entetes.Authorization, "Bearer abc123");
});

test("appelApi : 401 avec token → SessionExpireeError", async () => {
  const { impl } = fauxFetch(401, { message: "Token invalide ou expiré" });
  await assert.rejects(
    () => appelApi("/leads", { ...BASE, fetchImpl: impl, token: "perime" }),
    SessionExpireeError
  );
});

test("appelApi : 401 SANS token (login raté) → ErreurApi avec le message du backend", async () => {
  const { impl } = fauxFetch(401, { message: "Email ou mot de passe incorrect" });
  await assert.rejects(
    () => appelApi("/auth/login", { ...BASE, fetchImpl: impl, method: "POST", corps: {} }),
    (e: unknown) => e instanceof ErreurApi && e.message === "Email ou mot de passe incorrect"
  );
});

test("appelApi : erreur 400 expose status, message et details", async () => {
  const { impl } = fauxFetch(400, { message: "Données invalides", details: { erreurs: ["x"] } });
  await assert.rejects(
    () => appelApi("/sites", { ...BASE, fetchImpl: impl, method: "POST", corps: {} }),
    (e: unknown) =>
      e instanceof ErreurApi &&
      e.status === 400 &&
      JSON.stringify(e.details) === JSON.stringify({ erreurs: ["x"] })
  );
});

// ============================== helpers ======================================
test("queryString : ignore les vides, encode les valeurs", () => {
  assert.equal(queryString({}), "");
  assert.equal(queryString({ page: 2, q: "", siteId: undefined }), "?page=2");
  assert.equal(queryString({ q: "crème brûlée" }), "?q=cr%C3%A8me%20br%C3%BBl%C3%A9e");
});

test("decoderPayloadJwt : décode un payload valide, null sinon", () => {
  const payload = { email: "a@b.fr", role: "admin" };
  const token = ["x", Buffer.from(JSON.stringify(payload)).toString("base64url"), "y"].join(".");
  assert.deepEqual(decoderPayloadJwt(token), payload);
  assert.equal(decoderPayloadJwt("nimportequoi"), null);
});

// ============================== endpoints ====================================
test("login : POST /auth/login avec email + motDePasse", async () => {
  const { impl, appels } = fauxFetch(200, { token: "jwt" });
  const resultat = await login("a@b.fr", "secret", { ...BASE, fetchImpl: impl });
  assert.deepEqual(resultat, { token: "jwt" });
  assert.equal(appels[0].url, "http://api.test/auth/login");
  assert.equal(appels[0].init.body, JSON.stringify({ email: "a@b.fr", motDePasse: "secret" }));
});

test("listerLeads : construit la query depuis les filtres", async () => {
  const { impl, appels } = fauxFetch(200, { donnees: [], page: 1, limit: 20, total: 0, totalPages: 1 });
  await listerLeads({ page: 3, q: "devis", siteId: "" }, { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[0].url, "http://api.test/leads?page=3&q=devis");
});

test("creerSite : POST /sites et rend la clé API", async () => {
  const { impl } = fauxFetch(201, { id: 1, nom: "X", cleApi: "lead_abc", avertissement: "..." });
  const site = await creerSite(
    { nom: "X", domaine: "x.fr", emailNotification: "a@b.fr" },
    { ...BASE, fetchImpl: impl, token: "t" }
  );
  assert.equal(site.cleApi, "lead_abc");
});

test("marquerLu : PATCH /leads/:id avec { lu }", async () => {
  const { impl, appels } = fauxFetch(200, { id: 5, lu: true });
  await marquerLu(5, true, { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[0].url, "http://api.test/leads/5");
  assert.equal(appels[0].init.method, "PATCH");
  assert.equal(appels[0].init.body, JSON.stringify({ lu: true }));
});

// ============================== demandes (projet 9) ===========================
test("listerDemandes : filtre statut dans la query", async () => {
  const { impl, appels } = fauxFetch(200, { donnees: [], page: 1, limit: 20, total: 0, totalPages: 1 });
  const { listerDemandes } = await import("../src/api/endpoints.ts");
  await listerDemandes({ page: 1, statut: "en_attente" }, { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[0].url, "http://api.test/demandes?page=1&statut=en_attente");
});

test("repondreDemande : PATCH avec statut, message optionnel omis si vide", async () => {
  const { impl, appels } = fauxFetch(200, { id: 3, statut: "confirmee" });
  const { repondreDemande } = await import("../src/api/endpoints.ts");
  await repondreDemande(3, "confirmee", "  ", { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[0].url, "http://api.test/demandes/3");
  assert.equal(appels[0].init.body, JSON.stringify({ statut: "confirmee" }));

  await repondreDemande(3, "refusee", "Complet ce soir-là", { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[1].init.body, JSON.stringify({ statut: "refusee", reponse: "Complet ce soir-là" }));
});

// ============================== suivi (projet 10) =============================
test("obtenirRapport : GET /stats/rapport/:id avec mois", async () => {
  const { impl, appels } = fauxFetch(200, { site: { id: 1 }, mois: "2026-07", stats: {}, vues: [] });
  const { obtenirRapport } = await import("../src/api/endpoints.ts");
  await obtenirRapport(4, "2026-07", { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[0].url, "http://api.test/stats/rapport/4?mois=2026-07");
});

test("envoyerRapport : POST /stats/rapport/:id/envoyer", async () => {
  const { impl, appels } = fauxFetch(200, { envoye: true, mode: "console", destinataire: "x@y.fr", mois: "2026-07" });
  const { envoyerRapport } = await import("../src/api/endpoints.ts");
  const r = await envoyerRapport(4, "2026-07", { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[0].url, "http://api.test/stats/rapport/4/envoyer?mois=2026-07");
  assert.equal(appels[0].init.method, "POST");
  assert.equal(r.mode, "console");
});

test("releverAvis : POST /stats/avis/:id avec note et nbAvis", async () => {
  const { impl, appels } = fauxFetch(201, { id: 9 });
  const { releverAvis } = await import("../src/api/endpoints.ts");
  await releverAvis(4, { note: 4.8, nbAvis: 45 }, { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[0].url, "http://api.test/stats/avis/4");
  assert.equal(appels[0].init.body, JSON.stringify({ note: 4.8, nbAvis: 45 }));
});

// ============================== planning (projet 9 v2) ==========================
test("obtenirPlanning : GET /planning/:siteId", async () => {
  const { impl, appels } = fauxFetch(200, {
    site: { id: 1, nom: "Chalet", blocageMinutes: 1440 },
    plages: [],
    fermetures: [],
  });
  const { obtenirPlanning } = await import("../src/api/endpoints.ts");
  await obtenirPlanning(1, { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[0].url, "http://api.test/planning/1");
});

test("enregistrerPlanning : PUT avec les plages et le délai de blocage", async () => {
  const { impl, appels } = fauxFetch(200, { message: "Planning enregistré", nbPlages: 1 });
  const { enregistrerPlanning } = await import("../src/api/endpoints.ts");
  const plage = {
    jourSemaine: 4,
    heureDebut: "12:00",
    heureFin: "14:00",
    pasMinutes: 30,
    capacite: 20,
    mode: "restaurant" as const,
    libelle: "Déjeuner",
  };
  await enregistrerPlanning(1, { plages: [plage], blocageMinutes: 720 }, { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[0].url, "http://api.test/planning/1");
  assert.equal(appels[0].init.method, "PUT");
  assert.equal(appels[0].init.body, JSON.stringify({ plages: [plage], blocageMinutes: 720 }));
});

test("ajouterFermeture / supprimerFermeture : POST puis DELETE", async () => {
  const { impl, appels } = fauxFetch(201, { id: 9, jour: "2026-08-15", motif: null });
  const { ajouterFermeture, supprimerFermeture } = await import("../src/api/endpoints.ts");
  await ajouterFermeture(1, { jour: "2026-08-15" }, { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[0].url, "http://api.test/planning/1/fermetures");
  assert.equal(appels[0].init.method, "POST");

  await supprimerFermeture(1, 9, { ...BASE, fetchImpl: impl, token: "t" });
  assert.equal(appels[1].url, "http://api.test/planning/1/fermetures/9");
  assert.equal(appels[1].init.method, "DELETE");
});
