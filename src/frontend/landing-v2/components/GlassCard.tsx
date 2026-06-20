import { useRef, type CSSProperties, type HTMLAttributes, type PointerEvent, type ReactNode } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glowColor?: string;
  tilt?: boolean;
}

/**
 * Cursor-reactive glassmorphism card. Sets CSS vars --mx/--my on pointer move
 * so the .lv2-glass-card class can render a radial glow that follows the cursor.
 */
export function GlassCard({
  children,
  glowColor = "rgba(255,255,255,0.55)",
  tilt = false,
  className = "",
  style,
  onPointerMove,
  onPointerLeave,
  ...rest
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
      if (tilt) {
        const rx = ((y - 50) / 50) * -4;
        const ry = ((x - 50) / 50) * 4;
        el.style.setProperty("--rx", `${rx}deg`);
        el.style.setProperty("--ry", `${ry}deg`);
      }
    }
    onPointerMove?.(e);
  }

  function handleLeave(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (el) {
      el.style.setProperty("--mx", `50%`);
      el.style.setProperty("--my", `50%`);
      el.style.setProperty("--rx", `0deg`);
      el.style.setProperty("--ry", `0deg`);
    }
    onPointerLeave?.(e);
  }

  const composedStyle: CSSProperties = {
    ["--glow" as string]: glowColor,
    ...style,
  };

  return (
    <div
      ref={ref}
      className={`lv2-glass-card ${tilt ? "lv2-glass-tilt" : ""} ${className}`}
      style={composedStyle}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...rest}
    >
      <span className="lv2-glass-glow" aria-hidden />
      <span className="lv2-glass-border" aria-hidden />
      <div className="lv2-glass-content">{children}</div>
    </div>
  );
}
