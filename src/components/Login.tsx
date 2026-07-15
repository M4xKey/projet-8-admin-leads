// Écran de connexion admin.
import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext.tsx";

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      await login(email, motDePasse);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Connexion impossible");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="login-page">
      <form className="carte login-form" onSubmit={handleSubmit}>
        <h1>Admin — Leads</h1>
        {erreur && <p className="message-erreur">{erreur}</p>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="motDePasse">Mot de passe</label>
        <input
          id="motDePasse"
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button type="submit" disabled={enCours}>
          {enCours ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </main>
  );
}

export default Login;
