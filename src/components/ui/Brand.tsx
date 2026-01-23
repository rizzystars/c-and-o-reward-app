export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="h-8 w-8 rounded-xl bg-white/10 grid place-items-center">CO</div>
      <div className="text-lg font-semibold tracking-wide">C&amp;O Coffee Collective</div>
    </div>
  );
}
