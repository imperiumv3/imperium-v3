/** Classic ATS-safe single-column template. Theme-aware. */
import type { TemplateProps } from "./_shared";
import { fmtRange, pageStyle, formatLanguages, formatInterests } from "./_shared";
import { themeVars } from "./themes";

export function ClassicAtsTemplate({ resume, theme }: TemplateProps) {
  const { personal, summary, skills, experience, projects, education, certifications, languages, interests, meta } = resume;

  return (
    <div
      className="resume-page resume-classic-ats"
      style={{
        ...pageStyle(meta.paper),
        ...themeVars(theme),
        padding: "56px 64px",
        fontFamily: 'Arial, "Helvetica Neue", sans-serif',
        fontSize: 11.5,
        lineHeight: 1.45,
      }}
    >
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, margin: 0, letterSpacing: 0.3, textTransform: "uppercase", fontWeight: 700 }}>
          {personal.name || "Your Name"}
        </h1>
        {personal.title && <div style={{ fontSize: 13, color: "var(--rt-text-muted)", marginTop: 2 }}>{personal.title}</div>}
        <div style={{ fontSize: 11, color: "var(--rt-text-muted)", marginTop: 6 }}>
          {[personal.email, personal.phone, personal.location].filter(Boolean).join("  •  ")}
          {personal.links.length > 0 && "  •  "}
          {personal.links.map((l, i) => (
            <span key={l.url}>
              {i > 0 && "  •  "}
              <a href={l.url} style={{ color: "var(--rt-accent)", textDecoration: "none" }}>{l.label}</a>
            </span>
          ))}
        </div>
      </header>

      {summary && <Section title="Summary"><p style={{ margin: 0 }}>{summary}</p></Section>}

      {skills.length > 0 && (
        <Section title="Skills">
          {skills.map((g) => (
            <div key={g.category} className="r-block" style={{ marginBottom: 4 }}>
              {skills.length > 1 && <strong>{g.category}: </strong>}
              {g.items.join(", ")}
            </div>
          ))}
        </Section>
      )}

      {experience.length > 0 && (
        <Section title="Experience">
          {experience.map((e) => (
            <div key={e.id} className="r-block" style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{e.title}{e.company && ` — ${e.company}`}</strong>
                <span style={{ color: "var(--rt-text-muted)" }}>{fmtRange(e.start, e.end)}</span>
              </div>
              {e.location && <div style={{ fontStyle: "italic", color: "var(--rt-text-muted)", fontSize: 10.5 }}>{e.location}</div>}
              <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                {e.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {projects.length > 0 && (
        <Section title="Projects">
          {projects.map((p) => (
            <div key={p.id} className="r-block" style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{p.name}</strong>
                {p.url && <a href={p.url} style={{ color: "var(--rt-accent)", fontSize: 10.5 }}>{p.url}</a>}
              </div>
              {p.stack.length > 0 && <div style={{ fontStyle: "italic", color: "var(--rt-text-muted)", fontSize: 10.5 }}>{p.stack.join(", ")}</div>}
              <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                {p.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education">
          {education.map((ed) => (
            <div key={ed.id} className="r-block" style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div>
                <strong>{ed.school}</strong>
                {(ed.degree || ed.field) && <div>{[ed.degree, ed.field].filter(Boolean).join(", ")}</div>}
                {ed.gpa && <div style={{ color: "var(--rt-text-muted)", fontSize: 10.5 }}>GPA: {ed.gpa}</div>}
              </div>
              <span style={{ color: "var(--rt-text-muted)" }}>{fmtRange(ed.start, ed.end)}</span>
            </div>
          ))}
        </Section>
      )}

      {certifications.length > 0 && (
        <Section title="Certifications">
          <ul style={{ margin: "0 0 0 18px", padding: 0 }}>
            {certifications.map((c) => (
              <li key={c.id} className="r-block">{c.name}{c.issuer && ` — ${c.issuer}`}{c.date && ` (${c.date})`}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 14 }}>
      <h2 style={{
        fontSize: 12.5, margin: "0 0 6px", textTransform: "uppercase",
        letterSpacing: 1.2, borderBottom: "1px solid var(--rt-text)", paddingBottom: 3,
      }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
