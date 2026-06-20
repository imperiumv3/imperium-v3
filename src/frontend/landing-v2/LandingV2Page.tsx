import "./landing-v2.css";
import { useLenisScroll } from "./hooks/useLenisScroll";
import { useThemeScrollSync } from "./hooks/useThemeScrollSync";
import { TopFrame } from "./components/TopFrame";
import { BottomFrame } from "./components/BottomFrame";
import { Cursor } from "./components/Cursor";
import { ScrollProgressRail } from "./components/ScrollProgressRail";
import { HeroSection } from "./sections/HeroSection";
import { ManifestoSection } from "./sections/ManifestoSection";
import { IndexStripSection } from "./sections/IndexStripSection";
import { FutureAgentsSection } from "./sections/FutureAgentsSection";
import { TransitionSection } from "./sections/TransitionSection";
import { HorizontalNarrative } from "./sections/HorizontalNarrative";
import { CreatorSection } from "./sections/CreatorSection";
import { EnterImperiumSection } from "./sections/EnterImperiumSection";

export default function LandingV2Page() {
  useLenisScroll();
  useThemeScrollSync();

  return (
    <div className="lv2-shell">
      <div className="lv2-atmosphere" aria-hidden />
      <Cursor />
      <TopFrame />
      <ScrollProgressRail />

      <main className="lv2-main">
        <HeroSection />
        <ManifestoSection />
        <IndexStripSection />
        <FutureAgentsSection />
        <TransitionSection />
        <HorizontalNarrative />
        <CreatorSection />
        <EnterImperiumSection />
      </main>

      <BottomFrame />
    </div>
  );
}
