/** Splits text into per-char spans for subtle hover lift via CSS. */
export function HoverChars({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`lv2-hover-chars ${className}`} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span key={i} className="lv2-hc" style={{ transitionDelay: `${i * 12}ms` }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}
