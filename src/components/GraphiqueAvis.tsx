// Graphique d'évolution des avis Google (présence locale v2) — SVG fait main.
// Zéro dépendance (règle : pas de lib de charts pour un seul graphique) :
// barres = volume d'avis, ligne + points = note moyenne (échelle 0-5 à droite).
import type { ReleveAvis } from "../types.ts";

const LARGEUR = 600;
const HAUTEUR = 170;
const MARGE = { haut: 14, bas: 26, gauche: 8, droite: 30 };

function libelleDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function GraphiqueAvis({ releves }: { releves: ReleveAvis[] }) {
  if (releves.length < 2) {
    return (
      <p className="aide">
        L'évolution s'affichera à partir de deux relevés — enregistre un relevé chaque mois.
      </p>
    );
  }

  const zoneL = LARGEUR - MARGE.gauche - MARGE.droite;
  const zoneH = HAUTEUR - MARGE.haut - MARGE.bas;
  const maxAvis = Math.max(...releves.map((r) => r.nbAvis), 1);
  const pas = zoneL / releves.length;
  const largeurBarre = Math.min(38, pas * 0.55);

  const x = (i: number) => MARGE.gauche + pas * i + pas / 2;
  const yNote = (note: number) => MARGE.haut + zoneH * (1 - note / 5);
  const hBarre = (nb: number) => (zoneH * nb) / maxAvis;

  const cheminNote = releves
    .map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yNote(r.note).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      className="graphique-avis"
      role="img"
      aria-label={`Évolution des avis : ${releves.length} relevés, note actuelle ${releves[releves.length - 1].note}/5`}
    >
      {/* Repères de note (droite) */}
      {[0, 2.5, 5].map((n) => (
        <g key={n}>
          <line
            x1={MARGE.gauche}
            x2={LARGEUR - MARGE.droite}
            y1={yNote(n)}
            y2={yNote(n)}
            className="graphique-repere"
          />
          <text x={LARGEUR - MARGE.droite + 4} y={yNote(n) + 4} className="graphique-texte">
            {n}★
          </text>
        </g>
      ))}

      {/* Barres : volume d'avis */}
      {releves.map((r, i) => (
        <rect
          key={r.id}
          x={x(i) - largeurBarre / 2}
          y={MARGE.haut + zoneH - hBarre(r.nbAvis)}
          width={largeurBarre}
          height={hBarre(r.nbAvis)}
          className="graphique-barre"
        >
          <title>{`${libelleDate(r.createdAt)} : ${r.nbAvis} avis, note ${r.note}/5`}</title>
        </rect>
      ))}

      {/* Ligne + points : note moyenne */}
      <path d={cheminNote} className="graphique-ligne" />
      {releves.map((r, i) => (
        <circle key={r.id} cx={x(i)} cy={yNote(r.note)} r={3.5} className="graphique-point">
          <title>{`${libelleDate(r.createdAt)} : note ${r.note}/5`}</title>
        </circle>
      ))}

      {/* Dates */}
      {releves.map((r, i) => (
        <text key={r.id} x={x(i)} y={HAUTEUR - 8} textAnchor="middle" className="graphique-texte">
          {libelleDate(r.createdAt)}
        </text>
      ))}
    </svg>
  );
}

export default GraphiqueAvis;
