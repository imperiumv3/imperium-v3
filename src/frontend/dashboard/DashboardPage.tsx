import "./dashboard.css";
import { useDashboardData } from "./dashboard.data";
import { TopBar } from "./components/TopBar";
import { LeftPanel } from "./components/LeftPanel";
import { CenterPanel } from "./components/CenterPanel";
import { RightPanel } from "./components/RightPanel";
import { AnnouncementBanner } from "@frontend/system/AnnouncementBanner";
import { FeedbackWidget } from "@frontend/system/FeedbackWidget";

export function DashboardPage() {
  const data = useDashboardData();
  return (
    <div className="dash-root">
      <TopBar />
      <div style={{ padding: "0 24px" }}><AnnouncementBanner /></div>
      <div className="dash-grid">
        <LeftPanel data={data} />
        <CenterPanel data={data} />
        <RightPanel data={data} />
      </div>
      <FeedbackWidget />
    </div>
  );
}

export default DashboardPage;

