import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import bgAsset from "../assets/bg-clock.png.asset.json";
import swordAsset from "../assets/sword.png.asset.json";
import commanderAsset from "../assets/commander.png.asset.json";

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

  // layer translations
  const bgX = useTransform(sx, (v) => v * 8);
  const bgY = useTransform(sy, (v) => v * 6);
  const swX = useTransform(sx, (v) => v * 20);
  const swY = useTransform(sy, (v) => v * 14);
  const coX = useTransform(sx, (v) => v * 40);
  const coY = useTransform(sy, (v) => v * 24);
  const gX = useTransform(sx, (v) => v * 55);
  const gY = useTransform(sy, (v) => v * 35);

  // commander 3D tilt (clamp)
  const rotY = useTransform(sx, (v) => Math.max(-8, Math.min(8, v * 8)));
  const rotX = useTransform(sy, (v) => Math.max(-5, Math.min(5, -v * 5)));

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
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
      {/* Layer 1: background */}
      <motion.div
        className="imp-layer imp-layer-bg"
        style={{ x: bgX, y: bgY, backgroundImage: `url(${bgAsset.url})` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* edge fade into left form panel */}
      <div className="imp-stage-fade" />

      {/* Layer 2: sword */}
      <motion.img
        src={swordAsset.url}
        alt=""
        className="imp-layer imp-sword"
        style={{ x: swX, y: swY }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        draggable={false}
      />

      {/* Layer 3: commander with 3D tilt */}
      <motion.div
        className="imp-commander-wrap"
        style={{ x: coX, y: coY, rotateX: rotX, rotateY: rotY }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.img
          src={commanderAsset.url}
          alt=""
          className="imp-commander"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.4, ease: "easeOut" }}
          draggable={false}
        />
      </motion.div>

      {/* Layer 4 & 5: glass widgets */}
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
