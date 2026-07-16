// Vue Service (projet 9 v2, complément E5) : la feuille de service du jour.
// Les réservations d'un site pour UNE date, groupées par créneau, avec le
// total de couverts confirmés — ce que le restaurateur imprime avant le
// service. Lecture seule : pour répondre à une demande, onglet Demandes.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listerDemandes, listerSites } from "../api/endpoints.ts";
import { useAuth } from "../context/AuthContext.tsx";
import type { Demande } from "../types.ts";

/** Aujourd'hui "YYYY-MM-DD" (heure locale du navigateur). */
function aujourdHui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function heureDe(demande: Demande): string {
  return new Date(demande.dateDebut).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const LIBELLES_STATUT: Record<Demande["statutEffectif"], string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  refusee: "Refusée",
  expiree: "Expirée",
};

function ServiceView() {
  const { token } = useAuth();

  const [siteId, setSiteId] = useState<number | "">("");
  const [jour, setJour] = useState(aujourdHui());

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => listerSites({ token }),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["service", { siteId, jour }],
    queryFn: () =>
      // Le service d'un jour tient largement en 100 lignes ; le backend renvoie
      // les demandes triées chronologiquement quand `jour` est présent.
      listerDemandes({ siteId, jour, limit: 100 }, { token }),
    enabled: siteId !== "" && /^\d{4}-\d{2}-\d{2}$/.test(jour),
  });

  // Séjours (hébergement) exclus : la feuille de service concerne les créneaux.
  const demandes = (data?.donnees ?? []).filter((d) => d.type !== "hebergement");
  const confirmees = demandes.filter((d) => d.statut === "confirmee");
  const enAttente = demandes.filter((d) => d.statutEffectif === "en_attente");

  // Groupement par heure de créneau (les données arrivent déjà triées).
  const creneaux: { heure: string; demandes: Demande[] }[] = [];
  for (const demande of demandes) {
    if (demande.statut === "refusee") continue; // n'encombre pas la feuille
    const heure = heureDe(demande);
    const dernier = creneaux[creneaux.length - 1];
    if (dernier && dernier.heure === heure) dernier.demandes.push(demande);
    else creneaux.push({ heure, demandes: [demande] });
  }

  const siteNom = sites.find((s) => s.id === siteId)?.nom ?? "";
  const jourLisible = /^\d{4}-\d{2}-\d{2}$/.test(jour)
    ? new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { dateStyle: "full" })
    : jour;

  return (
    <section className="service">
      <div className="filtres service-filtres">
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value === "" ? "" : Number(e.target.value))}
          aria-label="Choisir un site"
        >
          <option value="">Choisir un site…</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={jour}
          onChange={(e) => setJour(e.target.value)}
          aria-label="Date du service"
        />
        <button
          type="button"
          disabled={siteId === "" || demandes.length === 0}
          onClick={() => window.print()}
        >
          🖨 Imprimer
        </button>
      </div>

      {siteId === "" ? (
        <p>Choisissez un site pour afficher sa feuille de service.</p>
      ) : isLoading ? (
        <p>Chargement…</p>
      ) : isError ? (
        <p className="message-erreur">
          Impossible de charger le service. Le backend est-il démarré (et la migration passée) ?
        </p>
      ) : (
        <div className="service-feuille">
          <header className="service-entete">
            <h2>{siteNom} — service du {jourLisible}</h2>
            <p>
              <strong>
                {confirmees.reduce((somme, d) => somme + d.nbPersonnes, 0)} personne(s) confirmée(s)
              </strong>{" "}
              sur {confirmees.length} réservation(s)
              {enAttente.length > 0 && <> · {enAttente.length} en attente de réponse</>}
            </p>
          </header>

          {creneaux.length === 0 ? (
            <p>Aucune réservation pour cette date.</p>
          ) : (
            creneaux.map((creneau) => (
              <div className="service-creneau" key={creneau.heure}>
                <h3>
                  {creneau.heure}
                  <span className="service-total">
                    {creneau.demandes
                      .filter((d) => d.statut === "confirmee")
                      .reduce((somme, d) => somme + d.nbPersonnes, 0)}{" "}
                    pers. confirmées
                  </span>
                </h3>
                <ul>
                  {creneau.demandes.map((demande) => (
                    <li
                      key={demande.id}
                      className={demande.statut === "confirmee" ? "" : "service-attente"}
                    >
                      <strong>{demande.nom}</strong> — {demande.nbPersonnes} pers.
                      {demande.type === "rdv" && <span className="badge">📅 RDV</span>}
                      {demande.statut !== "confirmee" && (
                        <span className={`badge badge-statut-${demande.statutEffectif}`}>
                          {LIBELLES_STATUT[demande.statutEffectif]}
                        </span>
                      )}
                      {demande.telephone && <> · {demande.telephone}</>}
                      {demande.message && <em> · « {demande.message} »</em>}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default ServiceView;
