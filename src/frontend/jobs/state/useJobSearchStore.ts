/**
 * useJobSearchStore — persists job search state across navigation.
 *
 * Survives: Jobs → Resume Studio → Jobs
 * Persists: search results, filters, selected job, sort preference.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SearchFiltersUI {
  title: string;
  skills: string;
  location: string;
  experience: string;
  workMode: string;
  salaryMin: string;
}

export const EMPTY_FILTERS: SearchFiltersUI = {
  title: "",
  skills: "",
  location: "",
  experience: "",
  workMode: "",
  salaryMin: "",
};

type SortKey = "match" | "recent" | "salary";

interface JobSearchState {
  lastFilters: SearchFiltersUI | null;
  selectedJobId: string | null;
  sort: SortKey;
  hasSearched: boolean;

  setLastFilters: (f: SearchFiltersUI | null) => void;
  setSelectedJobId: (id: string | null) => void;
  setSort: (s: SortKey) => void;
  clearSearch: () => void;
}

export const useJobSearchStore = create<JobSearchState>()(
  persist(
    (set) => ({
      lastFilters: null,
      selectedJobId: null,
      sort: "match",
      hasSearched: false,

      setLastFilters: (f) => set({ lastFilters: f, hasSearched: true }),
      setSelectedJobId: (id) => set({ selectedJobId: id }),
      setSort: (s) => set({ sort: s }),
      clearSearch: () =>
        set({
          lastFilters: null,
          selectedJobId: null,
          hasSearched: false,
        }),
    }),
    {
      name: "imperium-job-search-v1",
      partialize: (state) => ({
        lastFilters: state.lastFilters,
        selectedJobId: state.selectedJobId,
        sort: state.sort,
        hasSearched: state.hasSearched,
      }),
    }
  )
);
