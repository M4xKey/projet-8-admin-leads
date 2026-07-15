// Affichage des toasts — monté une seule fois dans App.
import { useToastStore } from "../store/useToastStore.ts";

function Toasts() {
  const toasts = useToastStore((state) => state.toasts);
  const retirer = useToastStore((state) => state.retirerToast);

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`toast toast-${t.type}`}
          onClick={() => retirer(t.id)}
          title="Fermer"
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}

export default Toasts;
