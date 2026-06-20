import type { CSSProperties, ReactNode } from "react";

interface SectionShellProps {
  index: number;
  total?: number;
  label?: string;
  tone?: "light" | "dark" | "red" | "ink";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Standard 100vh section shell fitting between fixed top + bottom frames.
 * Provides consistent index chip, label and tone backgrounds.
 */
export function SectionShell({
  index, total = 12, label, tone = "light", children, className = "", style,
}: SectionShellProps) {
  return (
    <section
      data-section={index}
      className={`lv2-shell-section lv2-tone-${tone} ${className}`}
      style={style}
    >
      <div className="lv2-shell-inner">
        <header className="lv2-shell-head">
          <span className="lv2-shell-index">— {String(index).padStart(2, "0")} / {total}</span>
          {label && <span className="lv2-shell-label">{label}</span>}
        </header>
        <div className="lv2-shell-body">{children}</div>
      </div>
    </section>
  );
}
