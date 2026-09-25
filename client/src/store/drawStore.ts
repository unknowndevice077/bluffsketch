import type { StrokeTool } from '@bluffsketch/shared';
import { create } from 'zustand';

interface DrawState {
  tool: StrokeTool;
  sizeIndex: number;
  /** Ink spent this round (never refunded, mirrors the server). */
  inkSpent: number;
  inkRound: number;
  showWord: boolean;
  setTool: (tool: StrokeTool) => void;
  setSizeIndex: (sizeIndex: number) => void;
  spendInk: (amount: number) => void;
  syncInk: (round: number, serverInk: number) => void;
  toggleWord: () => void;
}

export const useDraw = create<DrawState>()((set, get) => ({
  tool: 'brush',
  sizeIndex: 1,
  inkSpent: 0,
  inkRound: 0,
  showWord: true,
  setTool: (tool) => set({ tool }),
  setSizeIndex: (sizeIndex) => set({ sizeIndex }),
  spendInk: (amount) => set({ inkSpent: get().inkSpent + amount }),
  syncInk: (round, serverInk) => {
    const state = get();
    if (state.inkRound !== round) set({ inkRound: round, inkSpent: serverInk, tool: 'brush' });
    else if (serverInk > state.inkSpent) set({ inkSpent: serverInk });
  },
  toggleWord: () => set({ showWord: !get().showWord }),
}));
