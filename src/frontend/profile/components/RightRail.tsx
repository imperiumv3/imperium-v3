import type { ProfilePageData } from "../profile.data";

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="profile-rail-row">
      <div className="profile-rail-ico" aria-hidden>{icon}</div>
      <div className="profile-rail-meta">
        <div className="lbl">{label}</div>
        <div className="val">{value}</div>
      </div>
    </div>
  );
}

function Link({ icon, label, value, href }: { icon: string; label: string; value: string; href: string }) {
  return (
    <a className="profile-rail-row link" href={href} target="_blank" rel="noreferrer">
      <div className="profile-rail-ico" aria-hidden>{icon}</div>
      <div className="profile-rail-meta">
        <div className="lbl">{label}</div>
        <div className="val">{value}</div>
      </div>
      <span className="profile-rail-out" aria-hidden>↗</span>
    </a>
  );
}

export function RightRail({ data }: { data: ProfilePageData }) {
  const p = data.profile;
  const hasLinkedIn = !!p.linkedin_url;
  const hasGitHub = !!p.github_url;
  const hasPortfolio = !!p.portfolio_url;
  return (
    <aside className="profile-rail">
      <div className="profile-rail-card">
        <Row icon="👤" label="FULL NAME" value={p.name || "—"} />
        <Row icon="💼" label="PROFESSIONAL TITLE" value={p.headline || "—"} />
        <Row icon="📍" label="LOCATION" value={p.location || "—"} />
        <Row icon="✉️" label="EMAIL" value={p.email || "—"} />
        <Row icon="📞" label="PHONE NUMBER" value={p.phone || "—"} />
      </div>
      <div className="profile-rail-card">
        <div className="profile-rail-title">PROFESSIONAL LINKS</div>
        {hasLinkedIn ? (
          <Link icon="in" label="LinkedIn" value={p.linkedin_url.replace(/^https?:\/\//, "")} href={p.linkedin_url} />
        ) : (
          <Row icon="in" label="LinkedIn" value="Not connected" />
        )}
        {hasGitHub ? (
          <Link icon="gh" label="GitHub" value={p.github_url.replace(/^https?:\/\//, "")} href={p.github_url} />
        ) : (
          <Row icon="gh" label="GitHub" value="Not connected" />
        )}
        {hasPortfolio ? (
          <Link icon="◎" label="Portfolio" value={p.portfolio_url.replace(/^https?:\/\//, "")} href={p.portfolio_url} />
        ) : (
          <Row icon="◎" label="Portfolio" value="Not connected" />
        )}
      </div>
    </aside>
  );
}
