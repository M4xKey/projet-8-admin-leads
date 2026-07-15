// Endpoints typés du backend leads — une fonction par route, zéro logique.
// Chaque fonction accepte `options` pour l'injection (tests) : token, fetchImpl, baseUrl.
import { appelApi, queryString, type OptionsAppel } from "./client.ts";
import type { Lead, ReponsePaginee, Site, SiteCree } from "../types.ts";

type Options = Pick<OptionsAppel, "token" | "fetchImpl" | "baseUrl">;

// --- Auth --------------------------------------------------------------------
export function login(email: string, motDePasse: string, options: Options = {}) {
  return appelApi<{ token: string }>("/auth/login", {
    ...options,
    method: "POST",
    corps: { email, motDePasse },
  });
}

// --- Sites -------------------------------------------------------------------
export function listerSites(options: Options = {}) {
  return appelApi<Site[]>("/sites", options);
}

export function creerSite(
  donnees: { nom: string; domaine: string; emailNotification: string },
  options: Options = {}
) {
  return appelApi<SiteCree>("/sites", { ...options, method: "POST", corps: donnees });
}

export function regenererCle(siteId: number, options: Options = {}) {
  return appelApi<{ id: number; cleApi: string; avertissement: string }>(
    `/sites/${siteId}/regenerer-cle`,
    { ...options, method: "POST" }
  );
}

export function modifierSite(
  siteId: number,
  donnees: { actif?: boolean; emailNotification?: string },
  options: Options = {}
) {
  return appelApi<Site>(`/sites/${siteId}`, { ...options, method: "PATCH", corps: donnees });
}

// --- Leads -------------------------------------------------------------------
export function listerLeads(
  filtres: { page?: number; limit?: number; q?: string; siteId?: number | "" },
  options: Options = {}
) {
  return appelApi<ReponsePaginee<Lead>>(`/leads${queryString(filtres)}`, options);
}

export function marquerLu(leadId: number, lu: boolean, options: Options = {}) {
  return appelApi<Lead>(`/leads/${leadId}`, { ...options, method: "PATCH", corps: { lu } });
}
