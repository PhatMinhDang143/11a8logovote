export interface Exhibit {
  id: number;
  groupNumber: number; // 1, 2, 3, 4
  title: string;
  artist?: string;
  description?: string;
  url: string;
}

export interface Member {
  raw: string;
  displayName: string;
  normalized: string;
}

export interface VoteRecord {
  memberRaw: string;
  displayName: string;
  groupNumber: number; // 1, 2, 3, 4
  scores: { [exhibitId: number]: number | null };
  timestamp: string;
  comments?: string[];
}

export type ScreenState = 'login' | 'vote' | 'done';
