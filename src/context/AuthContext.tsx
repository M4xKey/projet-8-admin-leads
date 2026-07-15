// Contexte d'authentification — même pattern que ton projet-4 :
// token en sessionStorage, user décodé depuis le payload du JWT,
// logout = tout effacer. La seule différence : le login passe par
// l'endpoint typé au lieu d'un fetch local.
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { login as loginApi } from "../api/endpoints.ts";
import { decoderPayloadJwt, SessionExpireeError } from "../api/client.ts";
import type { Utilisateur } from "../types.ts";

const STORAGE_KEY = "admin-token";

interface AuthContextValue {
  token: string | null;
  user: Utilisateur | null;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => void;
  /** À appeler dans les onError : déconnecte si l'erreur est une session expirée. */
  gererErreurSession: (err: Error) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState<Utilisateur | null>(() => {
    const stocke = sessionStorage.getItem(STORAGE_KEY);
    return stocke ? decoderPayloadJwt<Utilisateur>(stocke) : null;
  });

  async function login(email: string, motDePasse: string) {
    const { token: nouveauToken } = await loginApi(email, motDePasse);
    sessionStorage.setItem(STORAGE_KEY, nouveauToken);
    setToken(nouveauToken);
    setUser(decoderPayloadJwt<Utilisateur>(nouveauToken));
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  function gererErreurSession(err: Error) {
    if (err instanceof SessionExpireeError) logout();
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, gererErreurSession }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const contexte = useContext(AuthContext);
  if (!contexte) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return contexte;
}

export { AuthProvider, useAuth };
