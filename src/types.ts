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

/** Enveloppe standard des listes paginées du backend (lib pagination). */
export interface ReponsePaginee<T> {
  donnees: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
