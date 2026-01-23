import { create } from "zustand";
import { useEffect } from "react";

type Toast = { id: string; text: string; kind?: "success"|"error"|"info"; ttl?: number };
type Store = {
  toasts: Toast[];
  push: (t: Omit<Toast,"id">) => void;
  remove: (id: string) => void;
};

export const useToastStore = create<Store>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts, { id: Math.random().toString(36).slice(2), ttl: 3000, ...t }] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter(x => x.id !== id) })),
}));

export function ToastViewport(){
  const { toasts, remove } = useToastStore();
  useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => remove(t.id), t.ttl || 3000));
    return () => { timers.forEach(clearTimeout); };
  }, [toasts, remove]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] space-y-2 w-[92vw] max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={"rounded-xl px-4 py-3 text-sm shadow-lg border backdrop-blur " +
            (t.kind==="error"   ? "bg-red-500/15 border-red-500/30" :
             t.kind==="success" ? "bg-emerald-500/15 border-emerald-500/30" :
                                  "bg-white/10 border-white/20")}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
