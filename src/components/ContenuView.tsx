// Vue Contenu (présence locale v2) : le calendrier éditorial d'un site.
// Par site et par mois : les publications prévues (GBP, réseaux, site web),
// bascule à faire → publié, ajout manuel ou depuis la banque d'idées
// saisonnières. Le nombre de posts publiés part dans le rapport mensuel.
import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listerSites,
  listerContenus,
  ideesContenus,
  creerContenu,
  modifierContenu,
  supprimerContenu,
} from "../api/endpoints.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { toast } from "../store/useToastStore.ts";
import type { Contenu } from "../types.ts";

const LIBELLES_CANAL: Record<Contenu["canal"], string> = {
  gbp: "Fiche Google",
  reseaux: "Réseaux",
  site: "Site web",
};

/** Mois courant "YYYY-MM" (heure locale du navigateur). */
function moisCourant(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ContenuView() {
  const { token, gererErreurSession } = useAuth();
  const queryClient = useQueryClient();

  const [siteId, setSiteId] = useState<number | "">("");
  const [mois, setMois] = useState(moisCourant());
  const [titre, setTitre] = useState("");
  const [canal, setCanal] = useState<Contenu["canal"]>("gbp");
  const [ideesVisibles, setIdeesVisibles] = useState(false);

  const moisValide = /^\d{4}-\d{2}$/.test(mois);

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => listerSites({ token }),
  });

  const { data: contenus = [], isLoading, isError } = useQuery({
    queryKey: ["contenus", { siteId, mois }],
    queryFn: () => listerContenus(siteId as number, mois, { token }),
    enabled: siteId !== "" && moisValide,
  });

  const { data: idees = [] } = useQuery({
    queryKey: ["idees-contenus", mois],
    queryFn: () => ideesContenus(mois, { token }),
    enabled: ideesVisibles && moisValide,
  });

  function surErreur(e: Error) {
    gererErreurSession(e);
    toast(e.message, "erreur");
  }

  function invalider() {
    queryClient.invalidateQueries({ queryKey: ["contenus"] });
    queryClient.invalidateQueries({ queryKey: ["rapport"] }); // "N posts publiés" du rapport
  }

  const creation = useMutation({
    mutationFn: (donnees: { titre: string; canal: Contenu["canal"] }) =>
      creerContenu({ siteId: siteId as number, mois, ...donnees }, { token }),
    onSuccess: () => {
      invalider();
      setTitre("");
      toast("Contenu ajouté au planning");
    },
    onError: surErreur,
  });

  const changementStatut = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: Contenu["statut"] }) =>
      modifierContenu(id, { statut }, { token }),
    onSuccess: (contenu) => {
      invalider();
      toast(contenu.statut === "publie" ? "Marqué publié ✓" : "Repassé à faire");
    },
    onError: surErreur,
  });

  const suppression = useMutation({
    mutationFn: (id: number) => supprimerContenu(id, { token }),
    onSuccess: () => {
      invalider();
      toast("Contenu supprimé");
    },
    onError: surErreur,
  });

  function handleAjout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (titre.trim()) creation.mutate({ titre: titre.trim(), canal });
  }

  const publies = contenus.filter((c) => c.statut === "publie").length;

  return (
    <section>
      <div className="filtres">
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
          type="month"
          value={mois}
          onChange={(e) => setMois(e.target.value)}
          aria-label="Mois du planning"
        />
      </div>

      {siteId === "" ? (
        <p>
          Choisissez un site pour gérer son calendrier de publications. Ce qui est marqué
          « publié » alimente le rapport mensuel du client.
        </p>
      ) : isLoading ? (
        <p>Chargement…</p>
      ) : isError ? (
        <p className="message-erreur">
          Impossible de charger le planning de contenu. Le backend est-il démarré (et la migration passée) ?
        </p>
      ) : (
        <>
          <div className="carte">
            <h3>
              Publications de {mois}
              {contenus.length > 0 && (
                <span className="checklist-score">
                  {publies}/{contenus.length} publiée(s)
                </span>
              )}
            </h3>

            {contenus.length === 0 && <p>Rien de prévu ce mois — ajoute une idée ci-dessous.</p>}

            <ul className="contenu-liste">
              {contenus.map((contenu) => (
                <li key={contenu.id} className={contenu.statut === "publie" ? "contenu-publie" : ""}>
                  <label>
                    <input
                      type="checkbox"
                      checked={contenu.statut === "publie"}
                      disabled={changementStatut.isPending}
                      onChange={(e) =>
                        changementStatut.mutate({
                          id: contenu.id,
                          statut: e.target.checked ? "publie" : "a_faire",
                        })
                      }
                      aria-label={contenu.statut === "publie" ? "Repasser à faire" : "Marquer publié"}
                    />
                    <span className="badge">{LIBELLES_CANAL[contenu.canal]}</span>
                    <span className="contenu-titre">{contenu.titre}</span>
                  </label>
                  <button
                    type="button"
                    className="bouton-discret"
                    disabled={suppression.isPending}
                    onClick={() => suppression.mutate(contenu.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAjout} className="contenu-ajout">
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value as Contenu["canal"])}
                aria-label="Canal"
              >
                <option value="gbp">Fiche Google</option>
                <option value="reseaux">Réseaux</option>
                <option value="site">Site web</option>
              </select>
              <input
                type="text"
                placeholder="Idée de publication (ex : photos de la nouvelle carte)"
                maxLength={200}
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                aria-label="Titre du contenu"
              />
              <button type="submit" disabled={!titre.trim() || creation.isPending}>
                Ajouter
              </button>
            </form>
          </div>

          <div className="carte">
            <h3>Idées pour ce mois</h3>
            {!ideesVisibles ? (
              <button type="button" className="bouton-discret" onClick={() => setIdeesVisibles(true)}>
                💡 Suggérer des idées de saison
              </button>
            ) : idees.length === 0 ? (
              <p>Chargement des idées…</p>
            ) : (
              <ul className="contenu-idees">
                {idees.map((idee) => (
                  <li key={idee.titre}>
                    <span className="badge">{LIBELLES_CANAL[idee.canal]}</span>
                    <span className="contenu-titre">{idee.titre}</span>
                    <button
                      type="button"
                      className="bouton-discret"
                      disabled={creation.isPending}
                      onClick={() => creation.mutate({ titre: idee.titre, canal: idee.canal })}
                    >
                      + Ajouter
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default ContenuView;
