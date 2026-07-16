// Vue Suivi (projet 10) : les chiffres du mois par site — visites (tracker),
// leads, demandes, avis — avec saisie du relevé d'avis Google et envoi du
// rapport mensuel au client par email.
import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listerSites,
  obtenirRapport,
  envoyerRapport,
  releverAvis,
  listerRelevesAvis,
} from "../api/endpoints.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { toast } from "../store/useToastStore.ts";
import GraphiqueAvis from "./GraphiqueAvis.tsx";
import ChecklistGbp from "./ChecklistGbp.tsx";
import ReponsesAvis from "./ReponsesAvis.tsx";

/** Mois courant "YYYY-MM" (heure locale du navigateur). */
function moisCourant(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function SuiviView() {
  const { token, gererErreurSession } = useAuth();
  const queryClient = useQueryClient();

  const [siteId, setSiteId] = useState<number | "">("");
  const [mois, setMois] = useState(moisCourant());
  const [note, setNote] = useState("");
  const [nbAvis, setNbAvis] = useState("");

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => listerSites({ token }),
  });

  const { data: rapport, isLoading, isError } = useQuery({
    queryKey: ["rapport", { siteId, mois }],
    queryFn: () => obtenirRapport(siteId as number, mois, { token }),
    enabled: siteId !== "" && /^\d{4}-\d{2}$/.test(mois),
  });

  // Historique complet des relevés d'avis (graphique d'évolution, v2)
  const { data: releves = [] } = useQuery({
    queryKey: ["releves-avis", siteId],
    queryFn: () => listerRelevesAvis(siteId as number, { token }),
    enabled: siteId !== "",
  });

  function surErreur(e: Error) {
    gererErreurSession(e);
    toast(e.message, "erreur");
  }

  const envoi = useMutation({
    mutationFn: () => envoyerRapport(siteId as number, mois, { token }),
    onSuccess: (r) =>
      toast(
        r.mode === "console"
          ? `Rapport généré — email affiché dans les logs du backend (mode console)`
          : `Rapport envoyé à ${r.destinataire}`
      ),
    onError: surErreur,
  });

  const releve = useMutation({
    mutationFn: () => releverAvis(siteId as number, { note: Number(note), nbAvis: Number(nbAvis) }, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rapport"] });
      queryClient.invalidateQueries({ queryKey: ["releves-avis"] }); // le graphique suit
      setNote("");
      setNbAvis("");
      toast("Relevé d'avis enregistré");
    },
    onError: surErreur,
  });

  function handleReleve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    releve.mutate();
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
        <input
          type="month"
          value={mois}
          onChange={(e) => setMois(e.target.value)}
          aria-label="Mois du rapport"
        />
      </div>

      {siteId === "" ? (
        <p>Choisis un site pour voir ses chiffres du mois.</p>
      ) : isLoading ? (
        <p>Chargement…</p>
      ) : isError ? (
        <p className="message-erreur">
          Impossible de charger le rapport. Le backend est-il démarré (et la migration passée) ?
        </p>
      ) : rapport ? (
        <>
          <div className="stats-grille">
            <div className="carte stat">
              <span className="stat-valeur">{rapport.stats.totalVues}</span>
              <span className="stat-libelle">visites du site</span>
              {rapport.stats.meilleurJour && (
                <span className="stat-detail">
                  pic : {rapport.stats.meilleurJour.compteur} le {rapport.stats.meilleurJour.jour}
                </span>
              )}
            </div>
            <div className="carte stat">
              <span className="stat-valeur">{rapport.stats.nbLeads}</span>
              <span className="stat-libelle">messages reçus</span>
            </div>
            <div className="carte stat">
              <span className="stat-valeur">{rapport.stats.nbDemandes}</span>
              <span className="stat-libelle">demandes de réservation</span>
            </div>
            <div className="carte stat">
              {rapport.stats.avis ? (
                <>
                  <span className="stat-valeur">{rapport.stats.avis.note}/5</span>
                  <span className="stat-libelle">
                    {rapport.stats.avis.nbAvis} avis Google
                    {rapport.stats.avis.nouveauxAvis !== null && ` (+${rapport.stats.avis.nouveauxAvis})`}
                  </span>
                </>
              ) : (
                <>
                  <span className="stat-valeur">—</span>
                  <span className="stat-libelle">aucun relevé d'avis</span>
                </>
              )}
            </div>
          </div>

          <div className="carte">
            <h2>Évolution des avis Google</h2>
            <GraphiqueAvis releves={releves} />
          </div>

          <div className="suivi-actions">
            <ChecklistGbp siteId={siteId as number} mois={mois} />
            {/* key : changer de site réinitialise le texte généré */}
            <ReponsesAvis key={rapport.site.id} etablissement={rapport.site.nom} />
            <form className="carte form-releve" onSubmit={handleReleve}>
              <h2>Relevé d'avis Google</h2>
              <p className="aide">
                Ouvre la fiche Google du client, recopie la note et le nombre d'avis (30 s/mois — automatisable en v2).
              </p>
              <div className="form-releve-champs">
                <div>
                  <label htmlFor="note">Note moyenne</label>
                  <input
                    id="note"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="nbAvis">Nombre d'avis</label>
                  <input
                    id="nbAvis"
                    type="number"
                    min="0"
                    value={nbAvis}
                    onChange={(e) => setNbAvis(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={releve.isPending}>
                  Enregistrer
                </button>
              </div>
            </form>

            <div className="carte form-releve">
              <h2>Rapport mensuel</h2>
              <p className="aide">
                Envoie ces chiffres par email à {rapport.site.nom} — la preuve mensuelle que le site travaille.
              </p>
              <button type="button" disabled={envoi.isPending} onClick={() => envoi.mutate()}>
                {envoi.isPending ? "Envoi..." : `Envoyer le rapport de ${mois}`}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

export default SuiviView;
