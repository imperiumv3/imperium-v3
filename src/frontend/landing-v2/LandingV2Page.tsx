import "./landing-v2.css";
import { useLenisScroll } from "./hooks/useLenisScroll";
import { useThemeScrollSync } from "./hooks/useThemeScrollSync";
import { TopFrame } from "./components/TopFrame";
import { BottomFrame } from "./components/BottomFrame";
import { Cursor } from "./components/Cursor";
import { HeroSection } from "./sections/HeroSection";
import { ManifestoSection } from "./sections/ManifestoSection";
import { IndexStripSection } from "./sections/IndexStripSection";
import { FutureAgentsSection } from "./sections/FutureAgentsSection";
import { TransitionSection } from "./sections/TransitionSection";
import { StorytellingSection } from "./sections/StorytellingSection";
import { JourneySection } from "./sections/JourneySection";
import { ProfileAnalyzeSection } from "./sections/ProfileAnalyzeSection";
import { WorkflowAgentSection } from "./sections/WorkflowAgentSection";
import { ExecuteSection } from "./sections/ExecuteSection";

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
        <FutureAgentsSection />
        <TransitionSection />
        <StorytellingSection />
        <JourneySection />
        <ProfileAnalyzeSection />
        <WorkflowAgentSection />
        <ExecuteSection />
      </main>

      <BottomFrame />
    </div>
  );
}

