// Vue Demandes : les demandes de réservation du widget (projet 9).
// Filtre par statut, et pour chaque demande en attente : confirmer/refuser
// avec un message optionnel — le client final est prévenu par email.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listerDemandes, repondreDemande } from "../api/endpoints.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { toast } from "../store/useToastStore.ts";
import type { Demande } from "../types.ts";

const LIBELLES_STATUT: Record<Demande["statutEffectif"], string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  refusee: "Refusée",
  expiree: "Expirée",
};

function formaterQuand(demande: Demande): string {
  const debut = new Date(demande.dateDebut);
  if (demande.type === "restaurant") {
    return debut.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  }
  const fin = demande.dateFin ? new Date(demande.dateFin) : null;
  return `${debut.toLocaleDateString("fr-FR", { dateStyle: "medium" })} → ${
    fin ? fin.toLocaleDateString("fr-FR", { dateStyle: "medium" }) : "?"
  }`;
}

function DemandesView() {
  const { token, gererErreurSession } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState("");
  // id de la demande dont le formulaire de réponse est déplié + brouillon du message
  const [reponseOuverte, setReponseOuverte] = useState<number | null>(null);
  const [messageReponse, setMessageReponse] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["demandes", { page, statut }],
    queryFn: () => listerDemandes({ page, statut: statut || undefined }, { token }),
  });

  const reponse = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: "confirmee" | "refusee" }) =>
      repondreDemande(id, statut, messageReponse, { token }),
    onSuccess: (demande) => {
      queryClient.invalidateQueries({ queryKey: ["demandes"] });
      setReponseOuverte(null);
      setMessageReponse("");
      toast(
        demande.statut === "confirmee"
          ? `Confirmée — ${demande.nom} est prévenu(e) par email`
          : `Refusée — ${demande.nom} est prévenu(e) par email`
      );
    },
    onError: (e: Error) => {
      gererErreurSession(e);
      toast(e.message, "erreur");
    },
  });

  if (isError) return <p className="message-erreur">Impossible de charger les demandes. Le backend est-il démarré (et la migration passée) ?</p>;

  return (
    <section>
      <div className="filtres">
        <select
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value);
            setPage(1);
          }}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="confirmee">Confirmées</option>
          <option value="refusee">Refusées</option>
          <option value="expiree">Expirées</option>
        </select>
      </div>

      {isLoading ? (
        <p>Chargement…</p>
      ) : data && data.donnees.length === 0 ? (
        <p>Aucune demande{statut ? " pour ce statut" : ""}.</p>
      ) : (
        <>
          <ul className="liste-leads">
            {data?.donnees.map((demande) => (
              <li key={demande.id} className="carte">
                <div className="lead-entete">
                  <span className={`badge badge-statut-${demande.statutEffectif}`}>
                    {LIBELLES_STATUT[demande.statutEffectif]}
                  </span>
                  <strong>{demande.nom}</strong>
                  <span className="badge">{demande.type === "hebergement" ? "🛏 Séjour" : "🍽 Table"}</span>
                  <span>{formaterQuand(demande)}</span>
                  <span>{demande.nbPersonnes} pers.</span>
                  <span className="badge">{demande.site.nom}</span>
                </div>

                <p className="lead-message">
                  <a href={`mailto:${demande.email}`}>{demande.email}</a>
                  {demande.telephone && <> · <a href={`tel:${demande.telephone}`}>{demande.telephone}</a></>}
                  {demande.message && <><br />« {demande.message} »</>}
                  {demande.reponse && <><br /><em>Votre réponse : {demande.reponse}</em></>}
                </p>

                {demande.statut === "en_attente" && (
                  <div className="reponse-bloc">
                    {reponseOuverte === demande.id ? (
                      <>
                        <textarea
                          rows={2}
                          placeholder="Message pour le client (optionnel) — ex : arrivée possible dès 15h"
                          value={messageReponse}
                          onChange={(e) => setMessageReponse(e.target.value)}
                        />
                        <div className="reponse-actions">
                          <button
                            type="button"
                            disabled={reponse.isPending}
                            onClick={() => reponse.mutate({ id: demande.id, statut: "confirmee" })}
                          >
                            ✓ Confirmer
                          </button>
                          <button
                            type="button"
                            className="bouton-refus"
                            disabled={reponse.isPending}
                            onClick={() => reponse.mutate({ id: demande.id, statut: "refusee" })}
                          >
                            ✕ Refuser
                          </button>
                          <button
                            type="button"
                            className="bouton-discret"
                            onClick={() => setReponseOuverte(null)}
                          >
                            Annuler
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="bouton-discret"
                        onClick={() => {
                          setReponseOuverte(demande.id);
                          setMessageReponse("");
                        }}
                      >
                        Répondre…
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Précédent
            </button>
            <span>
              Page {data?.page} / {data?.totalPages} — {data?.total} demande(s)
            </span>
            <button
              type="button"
              disabled={!data || page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant →
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default DemandesView;
