import { create } from "zustand";

export type FooterDockAction = {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
};

type FooterDockState = {
  addAction: FooterDockAction | null;
  setAddAction: (action: FooterDockAction | null) => void;
};

export const useFooterDockStore = create<FooterDockState>((set) => ({
  addAction: null,
  setAddAction: (action) => set({ addAction: action }),
}));
