import { Link } from "@tanstack/react-router";
import { HoverChars } from "./HoverChars";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" },
] as const;

export function TopFrame() {
  return (
    <header className="lv2-top">
      <div className="lv2-top-row">
        <Link to="/" className="lv2-brand-mark" aria-label="IMPERIUM home">
          <HoverChars text="IMPERIUM" />
        </Link>
        <nav className="lv2-top-nav" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="lv2-top-link">
              <HoverChars text={n.label} />
            </Link>
          ))}
          <span className="lv2-top-dot" aria-hidden />
        </nav>
      </div>
      <div className="lv2-top-divider" aria-hidden />
    </header>
  );
}
