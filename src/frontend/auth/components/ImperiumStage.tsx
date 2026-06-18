import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import heroAsset from "../assets/hero-combined.jpeg.asset.json";

function GlassWidget({
  className,
  icon,
  title,
  children,
  status,
  delay = 0,
  floatDelay = 0,
}: {
  className?: string;
  icon: ReactNode;
  title: string;
  status?: string;
  children: ReactNode;
  delay?: number;
  floatDelay?: number;
}) {
  return (
    <motion.div
      className={`imp-glass ${className ?? ""}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay, ease: "easeOut" }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: floatDelay }}
        className="imp-glass-inner"
      >
        <div className="imp-glass-icon">{icon}</div>
        <div className="imp-glass-body">
          <div className="imp-glass-title-row">
            <span className="imp-glass-title">{title}</span>
            {status ? (
              <span className="imp-glass-status">
                <span className="imp-status-dot" /> {status}
              </span>
            ) : null}
          </div>
          <div className="imp-glass-text">{children}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22" aria-hidden>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
function TerminalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22" aria-hidden>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export function ImperiumStage() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 80, damping: 20, mass: 0.6 });

  const heroX = useTransform(sx, (v) => v * 30);
  const heroY = useTransform(sy, (v) => v * 20);
  const gX = useTransform(sx, (v) => v * 55);
  const gY = useTransform(sy, (v) => v * 35);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    mx.set(px);
    my.set(py);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      ref={ref}
      className="imp-stage"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      aria-hidden
    >
      {/* Combined hero artwork (sword + commander) */}
      <motion.img
        src={heroAsset.url}
        alt=""
        className="imp-layer imp-hero"
        style={{ x: heroX, y: heroY }}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 0.2, ease: "easeOut" }}
        draggable={false}
      />

      {/* Glass widgets */}
      <motion.div className="imp-cards" style={{ x: gX, y: gY }}>
        <GlassWidget
          className="imp-card-top"
          icon={<CodeIcon />}
          title="CODING AGENT"
          status="ONLINE"
          delay={0.7}
          floatDelay={0}
        >
          <p>Building solutions.</p>
          <p>Compiling success.</p>
        </GlassWidget>
        <GlassWidget
          className="imp-card-bottom"
          icon={<TerminalIcon />}
          title="PROJECT STATUS"
          delay={0.9}
          floatDelay={1.2}
        >
          <p>12 Modules Active</p>
          <p>03 Deployments Live</p>
        </GlassWidget>
      </motion.div>

      {/* pagination dots */}
      <div className="imp-dots" aria-hidden>
        <span className="active" />
        <span />
        <span />
      </div>
    </div>
  );
}
