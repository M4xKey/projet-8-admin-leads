// Types partagés — miroir exact des réponses du backend (projet 7).

export interface Utilisateur {
  email: string;
  role: string;
}

export interface Site {
  id: number;
  nom: string;
  domaine: string;
  emailNotification: string;
  actif: boolean;
  createdAt: string;
  _count?: { leads: number };
}

/** Réponse de POST /sites : la clé n'est visible qu'à la création. */
export interface SiteCree {
  id: number;
  nom: string;
  cleApi: string;
  avertissement: string;
}

export interface Lead {
  id: number;
  nom: string;
  email: string;
  message: string;
  lu: boolean;
  createdAt: string;
  site: { id: number; nom: string };
}

/** Une demande de réservation reçue via le widget (projet 9). */
export interface Demande {
  id: number;
  type: "hebergement" | "restaurant" | "rdv";
  statut: "en_attente" | "confirmee" | "refusee";
  /** Statut calculé par le backend : ajoute "expiree" si en attente et date passée. */
  statutEffectif: "en_attente" | "confirmee" | "refusee" | "expiree";
  nom: string;
  email: string;
  telephone: string | null;
  message: string | null;
  dateDebut: string;
  dateFin: string | null;
  nbPersonnes: number;
  reponse: string | null;
  createdAt: string;
  site: { id: number; nom: string };
}

/** Rapport mensuel de présence locale (projet 10). */
export interface Rapport {
  site: { id: number; nom: string; domaine: string };
  mois: string; // "YYYY-MM"
  stats: {
    totalVues: number;
    joursAvecVisites: number;
    meilleurJour: { jour: string; compteur: number } | null;
    nbLeads: number;
    nbDemandes: number;
    avis: { note: number; nbAvis: number; nouveauxAvis: number | null } | null;
  };
  vues: { jour: string; compteur: number }[];
}

/** Une plage d'ouverture hebdomadaire du planning de réservation (projet 9 v2). */
export interface Plage {
  id?: number; // absent sur une plage en cours de création dans l'éditeur
  jourSemaine: number; // 0 = dimanche ... 6 = samedi
  heureDebut: string; // "12:00" (heure de Paris)
  heureFin: string; // "14:00"
  pasMinutes: number;
  capacite: number;
  mode: "restaurant" | "rdv";
  libelle: string | null;
}

/** Une fermeture exceptionnelle (aucun créneau ce jour-là). */
export interface Fermeture {
  id: number;
  jour: string; // "2026-08-15"
  motif: string | null;
}

/** Réponse de GET /planning/:siteId — tout l'onglet Planning en un appel. */
export interface Planning {
  site: { id: number; nom: string; blocageMinutes: number };
  plages: Plage[];
  fermetures: Fermeture[];
}

/** Enveloppe standard des listes paginées du backend (lib pagination). */
export interface ReponsePaginee<T> {
  donnees: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
