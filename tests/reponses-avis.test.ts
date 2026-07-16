// Tests du module de réponses aux avis (pur, sans navigateur).
import { test } from "node:test";
import assert from "node:assert/strict";
import { genererReponse, TONS } from "../src/lib/reponses-avis.ts";

test("chaque ton produit une réponse qui cite l'établissement", () => {
  for (const { valeur } of TONS) {
    const texte = genererReponse(valeur, { etablissement: "Le Chalet des Aiguilles" });
    assert.ok(texte.includes("Le Chalet des Aiguilles"), valeur);
    assert.ok(texte.length > 80, `réponse trop courte pour ${valeur}`);
  }
});

test("le prénom du client est utilisé quand il est connu", () => {
  const avec = genererReponse("positif", { etablissement: "Chalet", client: "Marie" });
  const sans = genererReponse("positif", { etablissement: "Chalet" });
  assert.match(avec, /Merci Marie/);
  assert.ok(!/Marie/.test(sans));
});

test("le ton négatif présente des excuses et propose un contact direct", () => {
  const texte = genererReponse("negatif", { etablissement: "Chalet" });
  assert.match(texte, /désolés/);
  assert.match(texte, /contactez-nous/i);
});

test("établissement vide → libellé neutre, pas de trou dans la phrase", () => {
  const texte = genererReponse("mitige", { etablissement: "  " });
  assert.match(texte, /notre établissement/);
});
