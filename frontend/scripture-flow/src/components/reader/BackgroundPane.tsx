import type { Verse } from "@/lib/bible";

export function BackgroundPane({ verses }: { verses: Verse[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.18] blur-[2px]">
        <div className="scripture columns-2 gap-8 p-8 text-[clamp(0.95rem,1.6vw,1.15rem)] leading-[1.8] text-foreground/70 md:columns-3 md:p-16">
          {verses.map((v) => (
            <p key={`${v.chapter}-${v.verse}`} className="mb-3 break-inside-avoid">
              <sup className="mr-1 text-primary/70">{v.verse}</sup>
              {v.text}
            </p>
          ))}
        </div>
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 45%, transparent 0%, var(--color-background) 75%)",
        }}
      />
    </div>
  );
}
