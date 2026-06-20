import "./landing-v2.css";
import { useLenisScroll } from "./hooks/useLenisScroll";
import { useThemeScrollSync } from "./hooks/useThemeScrollSync";
import { TopFrame } from "./components/TopFrame";
import { BottomFrame } from "./components/BottomFrame";
import { Cursor } from "./components/Cursor";
import { SectionPlaceholder } from "./components/SectionPlaceholder";
import { HeroSection } from "./sections/HeroSection";
import { ManifestoSection } from "./sections/ManifestoSection";
import { IndexStripSection } from "./sections/IndexStripSection";
import { HorizontalPanelSection } from "./sections/HorizontalPanelSection";

export default function LandingV2Page() {
  useLenisScroll();
  useThemeScrollSync();

  return (
    <div className="lv2-shell">
      <div className="lv2-atmosphere" aria-hidden />
      <Cursor />
      <TopFrame />

      <main className="lv2-main">
        <HeroSection />
        <ManifestoSection />
        <IndexStripSection />
        <SectionPlaceholder index={4} label="SECTION 04" />
        <section data-section={5} data-lv2-transition className="lv2-section lv2-transition">
          <span className="lv2-sec-index">— 05 / 12</span>
          <h2 className="lv2-sec-title">TRANSITION</h2>
        </section>
        <SectionPlaceholder index={6} label="METHOD" />
        <HorizontalPanelSection />
        <SectionPlaceholder index={11} label="SECTION 11" />
        <SectionPlaceholder index={12} label="SECTION 12" />
      </main>

      <BottomFrame />
    </div>
  );
}
