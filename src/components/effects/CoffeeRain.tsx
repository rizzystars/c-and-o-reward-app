import { useEffect, useRef } from "react";

const beans = ["☕","🫘","🌰","🍫"]; // fun mix – change as you like

export function CoffeeRain({ duration = 1400, count = 30 }: { duration?: number; count?: number }) {
  const ref = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    const root = ref.current!;
    const elts: HTMLSpanElement[] = [];
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.textContent = beans[i % beans.length];
      s.className = "coffee-drop";
      s.style.left = Math.random()*100 + "vw";
      s.style.animationDelay = (Math.random()*0.6) + "s";
      root.appendChild(s);
      elts.push(s);
    }
    const t = setTimeout(() => {
      elts.forEach(n => n.remove());
      root.remove();
    }, duration + 800);
    return () => clearTimeout(t);
  }, [count, duration]);

  return <div ref={ref} className="pointer-events-none fixed inset-0 z-[9999] coffee-rain"></div>;
}

// Imperative helper you can call from anywhere:
export function triggerCoffeeRain(opts?: { duration?: number; count?: number }) {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const { createRoot } = require("react-dom/client");
  const root = createRoot(mount);
  root.render(<CoffeeRain {...opts} />);
}
