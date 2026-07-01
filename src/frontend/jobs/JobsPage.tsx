import "./jobs.css";
import { useDiscovery, useJobDetails, useSelectJob } from "./jobs.logic";
import { useJobSearchStore } from "./state/useJobSearchStore";
import { ProfileMetricsRail } from "./components/ProfileMetricsRail";
import { JobSearchBar } from "./components/JobSearchBar";
import { TopMatchesRow } from "./components/TopMatchesRow";
import { SelectedJobSummary } from "./components/SelectedJobSummary";
import { JobIntelPanel } from "./components/JobIntelPanel";
import { AllJobsGrid } from "./components/AllJobsGrid";

export function JobsPage() {
  const { search, refresh, data, lastFilters } = useDiscovery();
  const { selectedJobId, setSelectedJobId } = useJobSearchStore();
  const details = useJobDetails(selectedJobId);
  const select = useSelectJob();

  const all = data?.all ?? [];
  const top5 = data?.top5 ?? [];
  const selectedJob = all.find((j) => j.id === selectedJobId) ?? details.data ?? null;

  const handleView = (id: string) => setSelectedJobId(id);
  const handleApply = (id: string) => select.mutate(id);

  return (
    <div className="jobs-root">
      <header className="jobs-header">
        <div>
          <h1 className="jobs-title">JOB <span>DISCOVERY ENGINE</span></h1>
          <div className="jobs-subtitle">AI-Powered Job Matching</div>
        </div>
      </header>

      <div className="jobs-layout">
        <ProfileMetricsRail />

        <div className="jobs-main">
          <JobSearchBar
            initial={lastFilters ?? undefined}
            loading={search.isPending}
            onSearch={(f) => { setSelectedJobId(null); search.mutate(f); }}
            onRefresh={refresh}
            canRefresh={!!lastFilters}
          />

          {search.isError && (
            <div className="jobs-error">Search failed. Try again or adjust filters.</div>
          )}

          <TopMatchesRow jobs={top5} selectedId={selectedJobId} onSelect={handleView} />
          <SelectedJobSummary job={selectedJob} />
        </div>

        <JobIntelPanel job={selectedJob} onApply={handleApply} applying={select.isPending} />
      </div>

      <AllJobsGrid jobs={all} selectedId={selectedJobId} onView={handleView} onApply={handleApply} />
    </div>
  );
}

export default JobsPage;
