// Vue Leads : tableau paginé + recherche debouncée + filtre par site + lu/non-lu.
// Toute la donnée serveur passe par React Query (même logique que ton projet-4 :
// une queryKey par combinaison de filtres, invalidation après mutation).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listerLeads, marquerLu, listerSites } from "../api/endpoints.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { useDebounce } from "../hooks/useDebounce.ts";
import { toast } from "../store/useToastStore.ts";
import type { Lead } from "../types.ts";

function LeadsView() {
  const { token, gererErreurSession } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState("");
  const [siteId, setSiteId] = useState<number | "">("");
  const rechercheDebouncee = useDebounce(recherche, 300);

  // La queryKey contient les filtres : changer un filtre = nouvelle entrée de cache.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leads", { page, q: rechercheDebouncee, siteId }],
    queryFn: () => listerLeads({ page, q: rechercheDebouncee, siteId }, { token }),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => listerSites({ token }),
  });

  const mutationLu = useMutation({
    mutationFn: ({ id, lu }: { id: number; lu: boolean }) => marquerLu(id, lu, { token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: (e: Error) => {
      gererErreurSession(e);
      toast(e.message, "erreur");
    },
  });

  if (isError) return <p className="message-erreur">Impossible de charger les leads. Le backend est-il démarré ?</p>;

  return (
    <section>
      <div className="filtres">
        <input
          type="search"
          placeholder="Rechercher (nom, email, message)..."
          value={recherche}
          onChange={(e) => {
            setRecherche(e.target.value);
            setPage(1); // toute nouvelle recherche repart page 1
          }}
          aria-label="Rechercher un lead"
        />
        <select
          value={siteId}
          onChange={(e) => {
            setSiteId(e.target.value === "" ? "" : Number(e.target.value));
            setPage(1);
          }}
          aria-label="Filtrer par site"
        >
          <option value="">Tous les sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p>Chargement…</p>
      ) : data && data.donnees.length === 0 ? (
        <p>Aucun lead ne correspond.</p>
      ) : (
        <>
          <ul className="liste-leads">
            {data?.donnees.map((lead: Lead) => (
              <li key={lead.id} className={`carte lead ${lead.lu ? "lead-lu" : ""}`}>
                <div className="lead-entete">
                  <strong>{lead.nom}</strong>
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                  <span className="badge">{lead.site.nom}</span>
                  <time dateTime={lead.createdAt}>
                    {new Date(lead.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </time>
                  <button
                    type="button"
                    className="bouton-discret"
                    onClick={() => mutationLu.mutate({ id: lead.id, lu: !lead.lu })}
                  >
                    {lead.lu ? "Marquer non lu" : "Marquer lu"}
                  </button>
                </div>
                <p className="lead-message">{lead.message}</p>
              </li>
            ))}
          </ul>

          <div className="pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Précédent
            </button>
            <span>
              Page {data?.page} / {data?.totalPages} — {data?.total} lead(s)
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

export default LeadsView;
