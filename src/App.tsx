// Racine de l'app : login si pas de session, sinon navigation Leads / Sites.
// Pas de routeur pour 2 vues — un simple état suffit et reste lisible ;
// le jour où le dashboard grossit (URLs partageables), on introduira react-router.
import { useState } from "react";
import { useAuth } from "./context/AuthContext.tsx";
import Login from "./components/Login.tsx";
import LeadsView from "./components/LeadsView.tsx";
import SitesView from "./components/SitesView.tsx";
import DemandesView from "./components/DemandesView.tsx";
import PlanningView from "./components/PlanningView.tsx";
import ServiceView from "./components/ServiceView.tsx";
import SuiviView from "./components/SuiviView.tsx";
import ContenuView from "./components/ContenuView.tsx";
import Toasts from "./components/Toasts.tsx";

type Vue = "leads" | "demandes" | "service" | "planning" | "suivi" | "contenu" | "sites";

function App() {
  const { user, logout } = useAuth();
  const [vue, setVue] = useState<Vue>("leads");

  if (!user) {
    return (
      <>
        <Login />
        <Toasts />
      </>
    );
  }

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-titre">Admin — Leads</span>
          <nav className="app-nav">
            <button
              type="button"
              className={vue === "leads" ? "actif" : ""}
              onClick={() => setVue("leads")}
            >
              Leads
            </button>
            <button
              type="button"
              className={vue === "demandes" ? "actif" : ""}
              onClick={() => setVue("demandes")}
            >
              Demandes
            </button>
            <button
              type="button"
              className={vue === "service" ? "actif" : ""}
              onClick={() => setVue("service")}
            >
              Service
            </button>
            <button
              type="button"
              className={vue === "planning" ? "actif" : ""}
              onClick={() => setVue("planning")}
            >
              Planning
            </button>
            <button
              type="button"
              className={vue === "suivi" ? "actif" : ""}
              onClick={() => setVue("suivi")}
            >
              Suivi
            </button>
            <button
              type="button"
              className={vue === "contenu" ? "actif" : ""}
              onClick={() => setVue("contenu")}
            >
              Contenu
            </button>
            <button
              type="button"
              className={vue === "sites" ? "actif" : ""}
              onClick={() => setVue("sites")}
            >
              Sites
            </button>
          </nav>
          <div className="app-user">
            <span>{user.email}</span>
            <button type="button" className="bouton-discret" onClick={logout}>
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="app-contenu">
        {vue === "leads" ? (
          <LeadsView />
        ) : vue === "demandes" ? (
          <DemandesView />
        ) : vue === "service" ? (
          <ServiceView />
        ) : vue === "planning" ? (
          <PlanningView />
        ) : vue === "suivi" ? (
          <SuiviView />
        ) : vue === "contenu" ? (
          <ContenuView />
        ) : (
          <SitesView />
        )}
      </main>

      <Toasts />
    </>
  );
}

export default App;
