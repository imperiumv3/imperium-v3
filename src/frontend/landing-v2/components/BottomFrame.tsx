import { Link } from "@tanstack/react-router";
import { HoverChars } from "./HoverChars";
import { scrollToTop } from "../hooks/useLenisScroll";

const MAP_URL = "https://www.google.com/maps/place/Hyderabad,+Telangana,+India";
const INSTAGRAM_URL = "https://instagram.com/imperium";

export function BottomFrame() {
  return (
    <footer className="lv2-bottom">
      <a
        href={MAP_URL}
        target="_blank"
        rel="noreferrer"
        className="lv2-bottom-cell lv2-bottom-left"
      >
        <HoverChars text="INDIA, HYDERABAD." />
      </a>

      <button
        type="button"
        onClick={scrollToTop}
        className="lv2-bottom-cell lv2-bottom-center"
        aria-label="Scroll to top"
      >
        <strong><HoverChars text="IMPERIUM" /></strong>
      </button>

      <div className="lv2-bottom-cell lv2-bottom-right">
        <a href="mailto:contact@imperium.ai">CONTACT@IMPERIUM.AI</a>
        <span className="lv2-sep">|</span>
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">INSTAGRAM</a>
        <span className="lv2-sep">|</span>
        <Link to="/profile"><strong>USERNAME</strong></Link>
      </div>
    </footer>
  );
}
