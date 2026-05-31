import type { Reference } from "@/lib/bible";

export function TopBar({ refData }: { refData: Reference }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-4">
      <div className="pane-surface flex items-center gap-2 rounded-full px-5 py-2.5 text-sm">
        <span className="font-serif text-base text-primary">{refData.book}</span>
        <span className="font-serif text-base tabular-nums text-foreground">{refData.chapter}</span>
        <span className="ml-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AMSV</span>
      </div>
    </div>
  );
}
