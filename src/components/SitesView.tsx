// Vue Sites : liste des sites clients, création (avec affichage UNIQUE de la
// clé API), régénération de clé, activation/désactivation.
import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listerSites, creerSite, regenererCle, modifierSite } from "../api/endpoints.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { toast } from "../store/useToastStore.ts";

function SitesView() {
  const { token, gererErreurSession } = useAuth();
  const queryClient = useQueryClient();

  const [nom, setNom] = useState("");
  const [domaine, setDomaine] = useState("");
  const [emailNotification, setEmailNotification] = useState("");
  // La clé fraîchement générée (création ou régénération) : affichée UNE fois,
  // jusqu'à ce que l'admin la masque. Jamais re-consultable ensuite (par design).
  const [cleVisible, setCleVisible] = useState<{ siteNom: string; cle: string } | null>(null);

  const { data: sites = [], isLoading, isError } = useQuery({
    queryKey: ["sites"],
    queryFn: () => listerSites({ token }),
  });

  function surErreur(e: Error) {
    gererErreurSession(e);
    toast(e.message, "erreur");
  }

  const creation = useMutation({
    mutationFn: () => creerSite({ nom, domaine, emailNotification }, { token }),
    onSuccess: (site) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      setCleVisible({ siteNom: site.nom, cle: site.cleApi });
      setNom(""); setDomaine(""); setEmailNotification("");
      toast(`Site « ${site.nom} » créé`);
    },
    onError: surErreur,
  });

  const regeneration = useMutation({
    mutationFn: (siteId: number) => regenererCle(siteId, { token }),
    onSuccess: (resultat, siteId) => {
      const site = sites.find((s) => s.id === siteId);
      setCleVisible({ siteNom: site?.nom ?? `site ${siteId}`, cle: resultat.cleApi });
      toast("Nouvelle clé générée — l'ancienne est invalidée");
    },
    onError: surErreur,
  });

  const bascule = useMutation({
    mutationFn: ({ id, actif }: { id: number; actif: boolean }) =>
      modifierSite(id, { actif }, { token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sites"] }),
    onError: surErreur,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    creation.mutate();
  }

  async function copierCle() {
    if (!cleVisible) return;
    await navigator.clipboard.writeText(cleVisible.cle);
    toast("Clé copiée dans le presse-papiers");
  }

  if (isError) return <p className="message-erreur">Impossible de charger les sites. Le backend est-il démarré ?</p>;

  return (
    <section>
      {cleVisible && (
        <div className="carte cle-api" role="alert">
          <p>
            <strong>Clé API de « {cleVisible.siteNom} »</strong> — copie-la maintenant,
            elle ne sera plus jamais affichée :
          </p>
          <code>{cleVisible.cle}</code>
          <div className="cle-actions">
            <button type="button" onClick={copierCle}>Copier</button>
            <button type="button" className="bouton-discret" onClick={() => setCleVisible(null)}>
              J'ai copié, masquer
            </button>
          </div>
        </div>
      )}

      <form className="carte form-site" onSubmit={handleSubmit}>
        <h2>Nouveau site client</h2>
        <div className="form-site-grille">
          <div>
            <label htmlFor="nom">Nom</label>
            <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="domaine">Domaine</label>
            <input
              id="domaine"
              value={domaine}
              onChange={(e) => setDomaine(e.target.value)}
              placeholder="exemple.fr"
              required
            />
          </div>
          <div>
            <label htmlFor="emailNotification">Email de notification</label>
            <input
              id="emailNotification"
              type="email"
              value={emailNotification}
              onChange={(e) => setEmailNotification(e.target.value)}
              required
            />
          </div>
        </div>
        <button type="submit" disabled={creation.isPending}>
          {creation.isPending ? "Création..." : "Créer le site (génère la clé API)"}
        </button>
      </form>

      {isLoading ? (
        <p>Chargement…</p>
      ) : (
        <ul className="liste-sites">
          {sites.map((site) => (
            <li key={site.id} className={`carte site ${site.actif ? "" : "site-inactif"}`}>
              <div className="site-infos">
                <strong>{site.nom}</strong>
                <span>{site.domaine}</span>
                <span>{site.emailNotification}</span>
                <span className="badge">{site._count?.leads ?? 0} lead(s)</span>
                {!site.actif && <span className="badge badge-inactif">désactivé</span>}
              </div>
              <div className="site-actions">
                <button
                  type="button"
                  className="bouton-discret"
                  onClick={() => regeneration.mutate(site.id)}
                >
                  Régénérer la clé
                </button>
                <button
                  type="button"
                  className="bouton-discret"
                  onClick={() => bascule.mutate({ id: site.id, actif: !site.actif })}
                >
                  {site.actif ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default SitesView;
