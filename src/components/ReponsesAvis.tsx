// Répondre à un avis Google (présence locale v2) : un modèle par ton, généré
// au nom de l'établissement, ÉDITABLE avant copie — jamais de texte robot
// publié tel quel.
import { useState } from "react";
import { genererReponse, TONS, type TonReponse } from "../lib/reponses-avis.ts";
import { toast } from "../store/useToastStore.ts";

function ReponsesAvis({ etablissement }: { etablissement: string }) {
  const [ton, setTon] = useState<TonReponse>("positif");
  const [client, setClient] = useState("");
  const [texte, setTexte] = useState(() => genererReponse("positif", { etablissement }));

  function regenerer(nouveauTon: TonReponse, nouveauClient: string) {
    setTexte(genererReponse(nouveauTon, { etablissement, client: nouveauClient.trim() || undefined }));
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      toast("Réponse copiée — collez-la sur la fiche Google");
    } catch {
      toast("Copie impossible — sélectionnez le texte à la main", "erreur");
    }
  }

  return (
    <div className="carte form-releve">
      <h2>Répondre à un avis</h2>
      <p className="aide">
        Choisis le ton, personnalise (mentionne le plat, le séjour, le problème précis), copie, colle
        sur la fiche Google.
      </p>
      <div className="reponses-avis-controles">
        <select
          value={ton}
          onChange={(e) => {
            const t = e.target.value as TonReponse;
            setTon(t);
            regenerer(t, client);
          }}
          aria-label="Ton de la réponse"
        >
          {TONS.map((t) => (
            <option key={t.valeur} value={t.valeur}>
              {t.libelle}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Prénom du client (optionnel)"
          value={client}
          onChange={(e) => {
            setClient(e.target.value);
            regenerer(ton, e.target.value);
          }}
          aria-label="Prénom du client"
        />
      </div>
      <textarea
        rows={4}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        aria-label="Réponse à personnaliser"
      />
      <button type="button" onClick={copier}>
        Copier la réponse
      </button>
    </div>
  );
}

export default ReponsesAvis;
