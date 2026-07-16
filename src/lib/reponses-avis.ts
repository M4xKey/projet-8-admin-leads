// Modèles de réponses aux avis Google (présence locale v2) — module pur.
// Répondre aux avis est le geste GBP le plus rentable et le plus négligé :
// on donne au commerçant (ou à l'agence pour lui) une base propre à
// personnaliser, jamais un texte robotique envoyé tel quel — d'où le passage
// par un textarea éditable avant la copie.

export type TonReponse = "positif" | "mitige" | "negatif";

export const TONS: { valeur: TonReponse; libelle: string }[] = [
  { valeur: "positif", libelle: "Avis positif (4-5 ★)" },
  { valeur: "mitige", libelle: "Avis mitigé (3 ★)" },
  { valeur: "negatif", libelle: "Avis négatif (1-2 ★)" },
];

interface ContexteReponse {
  etablissement: string;
  /** Prénom du client si connu — sinon la réponse reste impersonnelle propre. */
  client?: string;
}

const MODELES: Record<TonReponse, (ctx: ContexteReponse) => string> = {
  positif: ({ etablissement, client }) =>
    [
      `${client ? `Merci ${client}` : "Un grand merci"} pour ce retour chaleureux !`,
      `Toute l'équipe de ${etablissement} est ravie que votre visite vous ait plu.`,
      `Au plaisir de vous accueillir à nouveau très bientôt.`,
    ].join(" "),
  mitige: ({ etablissement, client }) =>
    [
      `${client ? `Merci ${client}` : "Merci"} d'avoir pris le temps de partager votre expérience.`,
      `Nous sommes contents que certains points vous aient plu, et nous prenons bonne note de ce qui peut être amélioré — c'est précieux pour nous.`,
      `N'hésitez pas à nous en dire plus directement : nous serions heureux de faire mieux lors de votre prochaine visite à ${etablissement}.`,
    ].join(" "),
  negatif: ({ etablissement, client }) =>
    [
      `${client ? `${client}, nous` : "Nous"} sommes sincèrement désolés que votre expérience n'ait pas été à la hauteur.`,
      `Ce n'est pas le niveau de service que nous voulons offrir à ${etablissement}.`,
      `Nous aimerions comprendre ce qui s'est passé et le corriger : contactez-nous directement, nous vous répondrons personnellement.`,
    ].join(" "),
};

/**
 * Génère la base de réponse pour un ton donné. Le texte est fait pour être
 * ÉDITÉ avant publication (mention du plat, du séjour, du problème précis).
 */
export function genererReponse(ton: TonReponse, contexte: ContexteReponse): string {
  const etablissement = contexte.etablissement.trim() || "notre établissement";
  return MODELES[ton]({ ...contexte, etablissement });
}
