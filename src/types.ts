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
  type: "hebergement" | "restaurant";
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

/** Enveloppe standard des listes paginées du backend (lib pagination). */
export interface ReponsePaginee<T> {
  donnees: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
