import { create } from "zustand";

type PhenoState = {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

export const usePhenoStore = create<PhenoState>((set) => ({
  open: true,
  toggle: () => set((state) => ({ open: !state.open })),
  setOpen: (open) => set({ open }),
}));
