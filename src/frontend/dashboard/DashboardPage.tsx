import "./dashboard.css";
import { useDashboardData } from "./dashboard.data";
import { TopBar } from "./components/TopBar";
import { LeftPanel } from "./components/LeftPanel";
import { CenterPanel } from "./components/CenterPanel";
import { RightPanel } from "./components/RightPanel";

export function DashboardPage() {
  const data = useDashboardData();
  return (
    <div className="dash-root">
      <TopBar />
      <div className="dash-grid">
        <LeftPanel data={data} />
        <CenterPanel data={data} />
        <RightPanel data={data} />
      </div>
    </div>
  );
}

export default DashboardPage;
