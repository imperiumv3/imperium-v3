import "./imperium-navbar.css";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";

type IconProps = { width?: number; height?: number };
const baseIconProps: IconProps = { width: 18, height: 18 };
const IconCore = (p: IconProps = {}) => (
  <svg {...baseIconProps} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></svg>
);
const IconBriefcase = (p: IconProps = {}) => (
  <svg {...baseIconProps} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
const IconDoc = (p: IconProps = {}) => (
  <svg {...baseIconProps} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v6h6" /></svg>
);
const IconChat = (p: IconProps = {}) => (
  <svg {...baseIconProps} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a8 8 0 0 1-12.7 6.5L3 20l1.5-5.3A8 8 0 1 1 21 12z" /></svg>
);
const IconSparkle = (p: IconProps = {}) => (
  <svg {...baseIconProps} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></svg>
);
const IconUser = (p: IconProps = {}) => (
  <svg {...baseIconProps} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
const IconHome = (p: IconProps = {}) => (
  <svg {...baseIconProps} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>
);

const NAV = [
  { to: "/",             label: "Home",        icon: IconHome },
  { to: "/dashboard",    label: "Dashboard",   icon: IconCore },
  { to: "/jobs",         label: "Jobs",        icon: IconBriefcase },
  { to: "/resume",       label: "Resume",      icon: IconDoc },
  { to: "/applications", label: "Tracker",     icon: IconChat },
  { to: "/autopilot",    label: "Local Agent", icon: IconSparkle },
  { to: "/profile",      label: "Profile",     icon: IconUser },
] as const;

export function ImperiumNavbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="imp-nav-wrap">
      <nav className="imp-nav" aria-label="Imperium navigation">
        {NAV.map((n) => {
          const active = pathname === n.to;
          const Icon = n.icon;
          return (
            <Link key={n.to} to={n.to} className="imp-nav-link" data-active={active}>
              {active && (
                <motion.span
                  layoutId="imp-nav-pill"
                  className="imp-nav-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon />
              <span className="imp-nav-text">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
