# Kit Admin React — dashboard du backend leads

Projet 8 de la roadmap. Deux choses en une :

1. **Le dashboard de l'agence** : tes leads (paginés, recherche, filtre par site, lu/non-lu) et tes sites clients (création avec clé API affichée une seule fois, régénération, désactivation) — fini les curl.
2. **Un boilerplate d'admin réutilisable** : auth JWT + session, client API typé et testé, React Query pour la donnée serveur, Zustand pour les toasts, hook useDebounce. Le squelette de tout futur SaaS (P9, P10...).

Stack identique à ton projet-4 (React 19, TypeScript, Vite, React Query, Zustand) — aucune brique nouvelle à apprendre.

## Démarrage

```
1-installer-et-tester.bat   → npm install + tests + type-check + build
2-demarrer.bat              → http://localhost:5173
```

Prérequis : le backend (projet 7) doit tourner — `3-demarrer.bat` dans son dossier. Connexion avec l'email/mot de passe admin définis à la configuration du projet 7. Si le backend est ailleurs que `http://localhost:3000`, copier `.env.example` en `.env` et renseigner `VITE_API_URL`.

## Architecture — ce qui est réutilisable

| Module | Rôle |
|---|---|
| `src/api/client.ts` | Cœur pur : `appelApi` (JSON, Bearer, erreurs typées, 401 → `SessionExpireeError`), `queryString`, `decoderPayloadJwt`. Testé sans navigateur (fetch injecté). |
| `src/api/endpoints.ts` | Une fonction typée par route du backend — la seule partie à réécrire pour un autre projet. |
| `src/context/AuthContext.tsx` | Session (sessionStorage + décodage JWT), même pattern que projet-4. |
| `src/store/useToastStore.ts` | Notifications globales sans props — `toast("message", "succes"/"erreur")` appelable partout, même hors composants. |
| `src/hooks/useDebounce.ts` | Le hook de l'exercice D1 du cahier, en version de référence. |

`npm test` = 12 tests `node:test` sur le client API (aucun framework de test à installer). Les vues React, elles, se valident visuellement + par le type-check et le build.

## Choix assumés

Pas de routeur pour 2 vues (un état `vue` suffit — react-router viendra quand les URLs devront être partageables). Pas de refresh token : la session dure 7 jours, un 401 déconnecte proprement. La clé API n'est jamais re-affichable — c'est le backend qui l'impose (stockage par empreinte), le dashboard respecte ce contrat avec l'encart « copie-la maintenant ».
