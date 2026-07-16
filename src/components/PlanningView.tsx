// Vue Planning (projet 9 v2) : les créneaux de réservation d'un site.
// Le commerçant définit ses plages hebdomadaires (jour, heures, pas, capacité),
// ses fermetures exceptionnelles, et le délai pendant lequel une demande en
// attente bloque son créneau. L'éditeur travaille sur une copie locale et
// enregistre TOUT d'un coup (le backend remplace, pas de diff).
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listerSites,
  obtenirPlanning,
  enregistrerPlanning,
  ajouterFermeture,
  supprimerFermeture,
} from "../api/endpoints.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { toast } from "../store/useToastStore.ts";
import type { Plage } from "../types.ts";

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
// Ordre d'affichage français : lundi d'abord.
const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];

const PLAGE_NEUVE: Plage = {
  jourSemaine: 1,
  heureDebut: "12:00",
  heureFin: "14:00",
  pasMinutes: 30,
  capacite: 20,
  mode: "restaurant",
  libelle: "",
};

function PlanningView() {
  const { token, gererErreurSession } = useAuth();
  const queryClient = useQueryClient();

  const [siteId, setSiteId] = useState<number | "">("");
  // Copie locale de l'éditeur (rechargée quand le planning arrive du backend)
  const [siteEditeur, setSiteEditeur] = useState<number | null>(null);
  const [plages, setPlages] = useState<Plage[]>([]);
  const [blocageHeures, setBlocageHeures] = useState("24");
  const [modifie, setModifie] = useState(false);
  // Formulaire d'ajout de fermeture
  const [jourFermeture, setJourFermeture] = useState("");
  const [motifFermeture, setMotifFermeture] = useState("");

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => listerSites({ token }),
  });

  const { data: planning, isLoading, isError } = useQuery({
    queryKey: ["planning", siteId],
    queryFn: () => obtenirPlanning(siteId as number, { token }),
    enabled: siteId !== "",
  });

  // Le backend fait foi… SAUF si l'utilisateur a des modifications en cours sur
  // le même site : React Query refait un fetch au retour de focus de la fenêtre,
  // et sans ce garde-fou l'éditeur écraserait des modifs non enregistrées.
  useEffect(() => {
    if (!planning) return;
    if (modifie && planning.site.id === siteEditeur) return;
    setPlages(planning.plages.map((p) => ({ ...p, libelle: p.libelle ?? "" })));
    setBlocageHeures(String(Math.round(planning.site.blocageMinutes / 60)));
    setModifie(false);
    setSiteEditeur(planning.site.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resynchro pilotée par `planning` seul
  }, [planning]);

  function surErreur(e: Error) {
    gererErreurSession(e);
    toast(e.message, "erreur");
  }

  const enregistrement = useMutation({
    mutationFn: () =>
      enregistrerPlanning(
        siteId as number,
        {
          plages: plages.map((p) => ({ ...p, libelle: p.libelle || null })),
          blocageMinutes: Math.round(Number(blocageHeures) * 60),
        },
        { token }
      ),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["planning"] });
      toast(`Planning enregistré (${r.nbPlages} plage${r.nbPlages > 1 ? "s" : ""})`);
    },
    onError: surErreur,
  });

  const ajoutFermeture = useMutation({
    mutationFn: () =>
      ajouterFermeture(
        siteId as number,
        { jour: jourFermeture, motif: motifFermeture.trim() || undefined },
        { token }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning"] });
      setJourFermeture("");
      setMotifFermeture("");
      toast("Fermeture ajoutée");
    },
    onError: surErreur,
  });

  const suppressionFermeture = useMutation({
    mutationFn: (fermetureId: number) =>
      supprimerFermeture(siteId as number, fermetureId, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning"] });
      toast("Fermeture supprimée");
    },
    onError: surErreur,
  });

  function changerPlage(index: number, champ: keyof Plage, valeur: string | number) {
    setPlages((courantes) =>
      // cast : la clé calculée fait perdre à TS le lien champ→type, mais chaque
      // appel passe bien la valeur du bon type (Number(...) pour les numériques)
      courantes.map((p, i) => (i === index ? ({ ...p, [champ]: valeur } as Plage) : p))
    );
    setModifie(true);
  }

  function handleFermeture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ajoutFermeture.mutate();
  }

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
      </div>

      {siteId === "" ? (
        <p>
          Choisissez un site pour définir ses créneaux de réservation. Sans planning,
          le widget de ce site propose une heure libre (comportement d'origine).
        </p>
      ) : isLoading ? (
        <p>Chargement…</p>
      ) : isError ? (
        <p className="message-erreur">
          Impossible de charger le planning. Le backend est-il démarré (et la migration passée) ?
        </p>
      ) : planning ? (
        <>
          {/* ---- Plages hebdomadaires ---------------------------------------- */}
          <div className="carte">
            <h3>Plages d'ouverture hebdomadaires</h3>
            {plages.length === 0 && (
              <p>
                Aucune plage — le widget de ce site propose une heure libre.
                Ajoutez une plage pour passer aux créneaux cliquables.
              </p>
            )}
            {plages.map((plage, i) => (
              <div className="planning-plage" key={plage.id ?? `neuve-${i}`}>
                <select
                  value={plage.jourSemaine}
                  onChange={(e) => changerPlage(i, "jourSemaine", Number(e.target.value))}
                  aria-label="Jour"
                >
                  {ORDRE_JOURS.map((j) => (
                    <option key={j} value={j}>
                      {JOURS[j]}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={plage.heureDebut}
                  onChange={(e) => changerPlage(i, "heureDebut", e.target.value)}
                  aria-label="Heure de début"
                />
                <span>→</span>
                <input
                  type="time"
                  value={plage.heureFin}
                  onChange={(e) => changerPlage(i, "heureFin", e.target.value)}
                  aria-label="Heure de fin"
                />
                <label>
                  toutes les
                  <input
                    type="number"
                    min={5}
                    max={240}
                    step={5}
                    value={plage.pasMinutes}
                    onChange={(e) => changerPlage(i, "pasMinutes", Number(e.target.value))}
                    aria-label="Pas en minutes"
                  />
                  min
                </label>
                <label>
                  capacité
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={plage.capacite}
                    onChange={(e) => changerPlage(i, "capacite", Number(e.target.value))}
                    aria-label="Capacité par créneau"
                  />
                </label>
                <select
                  value={plage.mode}
                  onChange={(e) => changerPlage(i, "mode", e.target.value)}
                  aria-label="Mode"
                >
                  <option value="restaurant">🍽 Table</option>
                  <option value="rdv">📅 RDV</option>
                </select>
                <input
                  type="text"
                  className="planning-libelle"
                  placeholder="Libellé (ex : Déjeuner)"
                  maxLength={50}
                  value={plage.libelle ?? ""}
                  onChange={(e) => changerPlage(i, "libelle", e.target.value)}
                  aria-label="Libellé"
                />
                <button
                  type="button"
                  className="bouton-refus"
                  onClick={() => {
                    setPlages((c) => c.filter((_, j) => j !== i));
                    setModifie(true);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            <div className="reponse-actions">
              <button
                type="button"
                className="bouton-discret"
                onClick={() => {
                  setPlages((c) => [...c, { ...PLAGE_NEUVE }]);
                  setModifie(true);
                }}
              >
                + Ajouter une plage
              </button>
            </div>
          </div>

          {/* ---- Délai de blocage --------------------------------------------- */}
          <div className="carte">
            <h3>Blocage des demandes en attente</h3>
            <p>
              Une demande <strong>en attente</strong> réserve ses places pendant{" "}
              <input
                type="number"
                className="planning-blocage"
                min={0}
                max={744}
                value={blocageHeures}
                onChange={(e) => {
                  setBlocageHeures(e.target.value);
                  setModifie(true);
                }}
                aria-label="Délai de blocage en heures"
              />{" "}
              heure(s). Passé ce délai sans réponse, les places redeviennent
              disponibles pour d'autres clients (0 = ne jamais bloquer).
            </p>
          </div>

          <div className="reponse-actions">
            <button
              type="button"
              disabled={!modifie || enregistrement.isPending}
              onClick={() => enregistrement.mutate()}
            >
              {enregistrement.isPending ? "Enregistrement…" : "Enregistrer le planning"}
            </button>
            {modifie && <span className="planning-note">Modifications non enregistrées</span>}
          </div>

          {/* ---- Fermetures exceptionnelles ------------------------------------ */}
          <div className="carte">
            <h3>Fermetures exceptionnelles</h3>
            {planning.fermetures.length === 0 ? (
              <p>Aucune fermeture à venir.</p>
            ) : (
              <ul className="planning-fermetures">
                {planning.fermetures.map((f) => (
                  <li key={f.id}>
                    <strong>{new Date(`${f.jour}T12:00:00`).toLocaleDateString("fr-FR", { dateStyle: "full" })}</strong>
                    {f.motif && <> — {f.motif}</>}
                    <button
                      type="button"
                      className="bouton-discret"
                      disabled={suppressionFermeture.isPending}
                      onClick={() => suppressionFermeture.mutate(f.id)}
                    >
                      Rouvrir
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleFermeture} className="planning-ajout-fermeture">
              <input
                type="date"
                required
                value={jourFermeture}
                onChange={(e) => setJourFermeture(e.target.value)}
                aria-label="Date de fermeture"
              />
              <input
                type="text"
                placeholder="Motif (optionnel)"
                maxLength={100}
                value={motifFermeture}
                onChange={(e) => setMotifFermeture(e.target.value)}
                aria-label="Motif"
              />
              <button type="submit" disabled={!jourFermeture || ajoutFermeture.isPending}>
                Fermer ce jour
              </button>
            </form>
          </div>
        </>
      ) : null}
    </section>
  );
}

export default PlanningView;
