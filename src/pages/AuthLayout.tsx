import { PropsWithChildren } from "react";
import { BrandMark } from "../components/ui/Brand";

export default function AuthLayout({ title, subtitle, children }: PropsWithChildren<{title: string; subtitle?: string;}>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900 text-white">
      <header className="max-w-md mx-auto px-4 py-6">
        <BrandMark />
      </header>

      <main className="max-w-md mx-auto px-4 pb-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur p-6 sm:p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm opacity-80 mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>

        <p className="text-xs opacity-70 mt-4 leading-relaxed">
          By continuing you agree to our <a className="underline" href="/privacy">Privacy &amp; Data</a>.
        </p>
      </main>
    </div>
  );
}
