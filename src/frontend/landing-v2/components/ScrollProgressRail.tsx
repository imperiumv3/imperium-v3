import { useEffect, useState } from "react";

const ITEMS = [
  { id: 4, label: "AGENTS" },
  { id: 5, label: "BRIDGE" },
  { id: 6, label: "STORY" },
  { id: 7, label: "JOURNEY" },
  { id: 8, label: "PROFILE" },
  { id: 9, label: "WORKFLOW" },
  { id: 10, label: "EXECUTE" },
  { id: 11, label: "CREATOR" },
  { id: 12, label: "ENTER" },
];

export function ScrollProgressRail() {
  const [active, setActive] = useState<number>(4);

  useEffect(() => {
    const els = ITEMS
      .map((i) => document.querySelector<HTMLElement>(`[data-section="${i.id}"]`))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = Number(e.target.getAttribute("data-section"));
            if (id) setActive(id);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0.01 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function go(id: number) {
    document.querySelector<HTMLElement>(`[data-section="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="lv2-rail" aria-label="Section navigation">
      <ul>
        {ITEMS.map((it) => (
          <li key={it.id} className={active === it.id ? "is-active" : ""}>
            <button type="button" onClick={() => go(it.id)} aria-label={`Go to section ${it.id} ${it.label}`}>
              <span className="lv2-rail-bar" aria-hidden />
              <span className="lv2-rail-num">{String(it.id).padStart(2, "0")}</span>
              <span className="lv2-rail-label">{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
