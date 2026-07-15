// Store de notifications (Zustand) — le jumeau React du toast.js du projet 1.
// N'importe quel composant peut déclencher un toast sans props :
// useToastStore.getState().ajouterToast("Sauvegardé", "succes")
import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  type: "succes" | "erreur";
}

interface ToastStore {
  toasts: Toast[];
  ajouterToast: (message: string, type?: Toast["type"]) => void;
  retirerToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  ajouterToast: (message, type = "succes") => {
    const toast: Toast = { id: crypto.randomUUID(), message, type };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    // Retrait automatique — le timer vit dans le store, pas dans un composant.
    setTimeout(() => get().retirerToast(toast.id), 3500);
  },
  retirerToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Raccourci utilisable hors composants (dans les onSuccess/onError des mutations). */
export const toast = (message: string, type: Toast["type"] = "succes") =>
  useToastStore.getState().ajouterToast(message, type);
