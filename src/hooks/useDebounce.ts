// Hook générique : retourne la valeur seulement après `delaiMs` sans changement.
// Sert ici à ne pas interroger l'API à chaque lettre tapée dans la recherche.
// (C'est l'exercice D1 du cahier — le voici en version de référence.)
import { useEffect, useState } from "react";

export function useDebounce<T>(valeur: T, delaiMs = 300): T {
  const [valeurRetardee, setValeurRetardee] = useState(valeur);

  useEffect(() => {
    const timer = setTimeout(() => setValeurRetardee(valeur), delaiMs);
    // Le cleanup annule le timer précédent à chaque frappe : c'est TOUT le mécanisme.
    return () => clearTimeout(timer);
  }, [valeur, delaiMs]);

  return valeurRetardee;
}
