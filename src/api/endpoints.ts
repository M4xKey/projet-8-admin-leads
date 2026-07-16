// Endpoints typés du backend leads — une fonction par route, zéro logique.
// Chaque fonction accepte `options` pour l'injection (tests) : token, fetchImpl, baseUrl.
import { appelApi, queryString, type OptionsAppel } from "./client.ts";
import type {
  ActionChecklist,
  Contenu,
  Demande,
  Fermeture,
  IdeeContenu,
  Lead,
  Plage,
  Planning,
  Rapport,
  ReleveAvis,
  ReponsePaginee,
  Site,
  SiteCree,
} from "../types.ts";

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

// --- Demandes de réservation (widget projet 9) ---------------------------------
export function listerDemandes(
  filtres: {
    page?: number;
    limit?: number;
    statut?: string;
    siteId?: number | "";
    /** "YYYY-MM-DD" (heure de Paris) — vue "service du jour", tri chronologique. */
    jour?: string;
  },
  options: Options = {}
) {
  return appelApi<ReponsePaginee<Demande>>(`/demandes${queryString(filtres)}`, options);
}

export function repondreDemande(
  demandeId: number,
  statut: "confirmee" | "refusee",
  reponse: string,
  options: Options = {}
) {
  return appelApi<Demande>(`/demandes/${demandeId}`, {
    ...options,
    method: "PATCH",
    corps: { statut, reponse: reponse.trim() || undefined },
  });
}

// --- Planning de réservation (projet 9 v2) ---------------------------------------
export function obtenirPlanning(siteId: number, options: Options = {}) {
  return appelApi<Planning>(`/planning/${siteId}`, options);
}

/** Remplace TOUTES les plages du site (l'éditeur envoie son état complet). */
export function enregistrerPlanning(
  siteId: number,
  donnees: { plages: Plage[]; blocageMinutes?: number },
  options: Options = {}
) {
  return appelApi<{ message: string; nbPlages: number }>(`/planning/${siteId}`, {
    ...options,
    method: "PUT",
    corps: donnees,
  });
}

export function ajouterFermeture(
  siteId: number,
  fermeture: { jour: string; motif?: string },
  options: Options = {}
) {
  return appelApi<Fermeture>(`/planning/${siteId}/fermetures`, {
    ...options,
    method: "POST",
    corps: fermeture,
  });
}

export function supprimerFermeture(siteId: number, fermetureId: number, options: Options = {}) {
  return appelApi<{ message: string }>(`/planning/${siteId}/fermetures/${fermetureId}`, {
    ...options,
    method: "DELETE",
  });
}

// --- Suivi de présence locale (projet 10) ---------------------------------------
export function obtenirRapport(siteId: number, mois: string, options: Options = {}) {
  return appelApi<Rapport>(`/stats/rapport/${siteId}${queryString({ mois })}`, options);
}

export function envoyerRapport(siteId: number, mois: string, options: Options = {}) {
  return appelApi<{ envoye: boolean; mode: string; destinataire: string; mois: string }>(
    `/stats/rapport/${siteId}/envoyer${queryString({ mois })}`,
    { ...options, method: "POST" }
  );
}

/** Historique des relevés d'avis (graphique d'évolution, présence locale v2). */
export function listerRelevesAvis(siteId: number, options: Options = {}) {
  return appelApi<ReleveAvis[]>(`/stats/avis/${siteId}`, options);
}

// --- Planning de contenu (présence locale v2) --------------------------------------
export function listerContenus(siteId: number, mois: string, options: Options = {}) {
  return appelApi<Contenu[]>(`/contenus${queryString({ siteId, mois })}`, options);
}

export function ideesContenus(mois: string, options: Options = {}) {
  return appelApi<IdeeContenu[]>(`/contenus/idees${queryString({ mois })}`, options);
}

export function creerContenu(
  donnees: { siteId: number; mois: string; titre: string; canal: Contenu["canal"]; description?: string },
  options: Options = {}
) {
  return appelApi<Contenu>("/contenus", { ...options, method: "POST", corps: donnees });
}

export function modifierContenu(
  contenuId: number,
  donnees: { statut?: Contenu["statut"]; titre?: string; description?: string | null },
  options: Options = {}
) {
  return appelApi<Contenu>(`/contenus/${contenuId}`, { ...options, method: "PATCH", corps: donnees });
}

export function supprimerContenu(contenuId: number, options: Options = {}) {
  return appelApi<{ message: string }>(`/contenus/${contenuId}`, { ...options, method: "DELETE" });
}

// --- Checklist GBP mensuelle (présence locale v2) -----------------------------------
export function obtenirChecklist(siteId: number, mois: string, options: Options = {}) {
  return appelApi<{ mois: string; actions: ActionChecklist[] }>(
    `/checklist/${siteId}${queryString({ mois })}`,
    options
  );
}

export function cocherChecklist(
  siteId: number,
  coche: { mois: string; cle: string; fait: boolean },
  options: Options = {}
) {
  return appelApi<{ mois: string; actions: ActionChecklist[] }>(`/checklist/${siteId}`, {
    ...options,
    method: "PUT",
    corps: coche,
  });
}

export function releverAvis(
  siteId: number,
  releve: { note: number; nbAvis: number },
  options: Options = {}
) {
  return appelApi<{ id: number }>(`/stats/avis/${siteId}`, {
    ...options,
    method: "POST",
    corps: releve,
  });
}
