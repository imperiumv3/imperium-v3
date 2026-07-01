/**
 * ResumeRepository — storage abstraction. Today: LocalResumeRepository wraps
 * localStorage. Tomorrow: SupabaseResumeRepository can be swapped in.
 *
 * WARNING: Do NOT use LocalResumeRepository in production without user-scoping.
 * The Zustand store (useResumeStore) is the canonical state source and does NOT
 * persist to localStorage. This repository exists for potential future use with
 * a Supabase-backed implementation that scopes data by user ID.
 */
import type { ResumeJSON, ResumeVersion } from "@frontend/resume/schema";

export interface ResumeRepository {
  save(resume: ResumeJSON): Promise<void>;
  load(): Promise<ResumeJSON | null>;
  versions(): Promise<ResumeVersion[]>;
  saveVersion(v: ResumeVersion): Promise<void>;
}

export class LocalResumeRepository implements ResumeRepository {
  private keyPrefix: string;
  constructor(userId?: string) {
    this.keyPrefix = userId ? `resume-${userId}` : "resume-anon";
  }
  async save(resume: ResumeJSON): Promise<void> {
    try {
      localStorage.setItem(`${this.keyPrefix}-current`, JSON.stringify(resume));
    } catch {
      /* quota */
    }
  }
  async load(): Promise<ResumeJSON | null> {
    try {
      const raw = localStorage.getItem(`${this.keyPrefix}-current`);
      return raw ? (JSON.parse(raw) as ResumeJSON) : null;
    } catch {
      return null;
    }
  }
  async versions(): Promise<ResumeVersion[]> {
    try {
      const raw = localStorage.getItem(`${this.keyPrefix}-versions`);
      return raw ? (JSON.parse(raw) as ResumeVersion[]) : [];
    } catch {
      return [];
    }
  }
  async saveVersion(v: ResumeVersion): Promise<void> {
    const all = await this.versions();
    all.push(v);
    try {
      localStorage.setItem(`${this.keyPrefix}-versions`, JSON.stringify(all));
    } catch {
      /* quota */
    }
  }
}

export function createResumeRepository(userId?: string): ResumeRepository {
  return new LocalResumeRepository(userId);
}
