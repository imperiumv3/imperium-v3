import "./landing-v2.css";
import { useLenisScroll } from "./hooks/useLenisScroll";
import { useThemeScrollSync } from "./hooks/useThemeScrollSync";
import { TopFrame } from "./components/TopFrame";
import { BottomFrame } from "./components/BottomFrame";
import { Cursor } from "./components/Cursor";
import { SectionPlaceholder } from "./components/SectionPlaceholder";
import { HeroSection } from "./sections/HeroSection";
import { HorizontalPanelSection } from "./sections/HorizontalPanelSection";

export default function LandingV2Page() {
  useLenisScroll();
  useThemeScrollSync();

  return (
    <div className="lv2-shell">
      <Cursor />
      <TopFrame />

      <main className="lv2-main">
        <HeroSection />
        <SectionPlaceholder index={2} />
        <SectionPlaceholder index={3} />
        <SectionPlaceholder index={4} />
        <SectionPlaceholder index={5} />
        <SectionPlaceholder index={6} />
        <HorizontalPanelSection />
        <SectionPlaceholder index={11} />
        <SectionPlaceholder index={12} />
      </main>

      <BottomFrame />
    </div>
  );
}
