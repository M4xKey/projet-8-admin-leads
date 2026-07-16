// Checklist GBP mensuelle (présence locale v2) : les 5 gestes de présence
// locale, cochables par site et par mois. Le score X/5 part dans le rapport.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { obtenirChecklist, cocherChecklist } from "../api/endpoints.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { toast } from "../store/useToastStore.ts";

function ChecklistGbp({ siteId, mois }: { siteId: number; mois: string }) {
  const { token, gererErreurSession } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["checklist", { siteId, mois }],
    queryFn: () => obtenirChecklist(siteId, mois, { token }),
    enabled: /^\d{4}-\d{2}$/.test(mois),
  });

  const coche = useMutation({
    mutationFn: ({ cle, fait }: { cle: string; fait: boolean }) =>
      cocherChecklist(siteId, { mois, cle, fait }, { token }),
    onSuccess: (reponse) => {
      // La route renvoie l'état complet du mois : on remplace directement.
      queryClient.setQueryData(["checklist", { siteId, mois }], reponse);
      queryClient.invalidateQueries({ queryKey: ["rapport"] }); // le score X/5 du rapport
    },
    onError: (e: Error) => {
      gererErreurSession(e);
      toast(e.message, "erreur");
    },
  });

  const actions = data?.actions ?? [];
  const faites = actions.filter((a) => a.fait).length;

  return (
    <div className="carte form-releve">
      <h2>
        Entretien fiche Google{" "}
        {actions.length > 0 && (
          <span className="checklist-score">
            {faites}/{actions.length}
          </span>
        )}
      </h2>
      <p className="aide">Les 5 gestes du mois — le score part dans le rapport client.</p>
      {isLoading ? (
        <p>Chargement…</p>
      ) : (
        <ul className="checklist-liste">
          {actions.map((action) => (
            <li key={action.cle}>
              <label title={action.description}>
                <input
                  type="checkbox"
                  checked={action.fait}
                  disabled={coche.isPending}
                  onChange={(e) => coche.mutate({ cle: action.cle, fait: e.target.checked })}
                />
                <span>{action.libelle}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ChecklistGbp;
