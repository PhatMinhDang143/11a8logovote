import { Exhibit, VoteRecord } from '../types';
import { DEFAULT_EXHIBITS, DEFAULT_GAS_URL, RAW_MEMBERS, normalizeString, toTitleCase } from '../data/initialData';

const VOTE_STORAGE_PREFIX = 'gallery_vote_v3:';
const LEGACY_VOTE_PREFIX = 'gallery_vote_v2:';
const EXHIBITS_STORAGE_KEY = 'gallery_exhibits_v2';
const GAS_URL_STORAGE_KEY = 'gallery_gas_url';
const LAST_SYNC_KEY = 'gallery_last_sync';

export const storageService = {
  // Google Apps Script Web App URL Config
  getGasUrl(): string {
    try {
      const stored = localStorage.getItem(GAS_URL_STORAGE_KEY);
      if (stored && stored.trim()) {
        return stored.trim();
      }
    } catch {
      // Fallback
    }
    // Check environment variable if available
    const envUrl = (import.meta as unknown as { env?: { VITE_GOOGLE_APPS_SCRIPT_URL?: string } })?.env?.VITE_GOOGLE_APPS_SCRIPT_URL;
    return (envUrl || DEFAULT_GAS_URL || '').trim();
  },

  setGasUrl(url: string): void {
    try {
      if (url.trim()) {
        localStorage.setItem(GAS_URL_STORAGE_KEY, url.trim());
      } else {
        localStorage.removeItem(GAS_URL_STORAGE_KEY);
      }
      window.dispatchEvent(new Event('gallery-vote-updated'));
    } catch (e) {
      console.error('Failed to set GAS URL', e);
    }
  },

  getLastSyncTime(): string | null {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  },

  // Test connection to Google Apps Script Web App
  async testGoogleSheetConnection(testUrl?: string): Promise<{ success: boolean; message: string; count?: number }> {
    const url = (testUrl || this.getGasUrl()).trim();
    if (!url) {
      return { success: false, message: 'Chưa nhập URL Google Apps Script Web App.' };
    }

    try {
      const separator = url.includes('?') ? '&' : '?';
      const fetchUrl = `${url}${separator}action=test&t=${Date.now()}`;
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Lỗi kết nối HTTP ${response.status}: ${response.statusText}. Vui lòng kiểm tra quyền truy cập (Chọn "Anyone" khi Triển khai).`,
        };
      }

      const data = await response.json();
      if (data && data.success !== false) {
        return {
          success: true,
          message: `Kết nối thành công! Đã tìm thấy ${data.count ?? (data.votes?.length || 0)} bản ghi trên Google Sheet.`,
          count: data.count ?? (data.votes?.length || 0),
        };
      } else {
        return {
          success: false,
          message: data.error || 'Google Apps Script trả về lỗi.',
        };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Không thể kết nối đến Apps Script (${errMsg}). Hãy đảm bảo đã chọn "Anyone" (Bất kỳ ai) khi Triển khai Web App.`,
      };
    }
  },

  // Fetch all votes from Google Sheet and mirror into local state
  async syncWithGoogleSheets(): Promise<{ success: boolean; count: number; error?: string }> {
    const url = this.getGasUrl();
    if (!url) {
      return { success: false, count: 0, error: 'Chưa cấu hình Google Apps Script URL.' };
    }

    try {
      const separator = url.includes('?') ? '&' : '?';
      const fetchUrl = `${url}${separator}t=${Date.now()}`;
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data && data.success !== false && Array.isArray(data.votes)) {
        // 1. Build a set of all normalized student names currently existing in Google Sheets
        const remoteNormalizedNames = new Set(
          data.votes
            .filter((v: VoteRecord) => v && v.memberRaw)
            .map((v: VoteRecord) => normalizeString(v.memberRaw))
        );

        // 2. Remove any local vote keys that NO LONGER exist in Google Sheets (e.g. user deleted row on Sheet)
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith(VOTE_STORAGE_PREFIX) || key.startsWith(LEGACY_VOTE_PREFIX))) {
            const memberKey = key
              .replace(VOTE_STORAGE_PREFIX, '')
              .replace(LEGACY_VOTE_PREFIX, '');
            if (!remoteNormalizedNames.has(memberKey)) {
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        // 3. Save/Update current valid votes from Google Sheet into local storage cache
        data.votes.forEach((v: VoteRecord) => {
          if (v && v.memberRaw) {
            const key = VOTE_STORAGE_PREFIX + normalizeString(v.memberRaw);
            const normalizedVote: VoteRecord = {
              memberRaw: v.memberRaw,
              displayName: v.displayName || toTitleCase(v.memberRaw),
              groupNumber: Number(v.groupNumber) || 1,
              scores: v.scores || {},
              timestamp: v.timestamp || new Date().toISOString(),
            };
            localStorage.setItem(key, JSON.stringify(normalizedVote));
          }
        });

        // 4. If exhibits returned from Google Sheet, sync them too
        if (Array.isArray(data.exhibits) && data.exhibits.length > 0) {
          localStorage.setItem(EXHIBITS_STORAGE_KEY, JSON.stringify(data.exhibits));
        }

        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        window.dispatchEvent(new Event('gallery-vote-updated'));
        return { success: true, count: data.votes.length };
      } else {
        throw new Error(data.error || 'Dữ liệu không hợp lệ từ Google Sheet');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Google Sheet sync failed, falling back to local data:', errMsg);
      return { success: false, count: 0, error: errMsg };
    }
  },

  // Exhibits
  getExhibits(): Exhibit[] {
    try {
      const raw = localStorage.getItem(EXHIBITS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_EXHIBITS;
  },

  saveExhibits(exhibits: Exhibit[]): void {
    try {
      localStorage.setItem(EXHIBITS_STORAGE_KEY, JSON.stringify(exhibits));
      window.dispatchEvent(new Event('gallery-vote-updated'));

      // Push to Google Sheets if configured so all devices & students get the updated photos
      const gasUrl = this.getGasUrl();
      if (gasUrl) {
        this.pushExhibitsToGoogleSheets(exhibits, gasUrl);
      }
    } catch (e) {
      console.error('Failed to save exhibits', e);
    }
  },

  async pushExhibitsToGoogleSheets(exhibits: Exhibit[], gasUrl?: string): Promise<boolean> {
    const url = gasUrl || this.getGasUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'saveExhibits',
          exhibits: exhibits,
        }),
      });
      return true;
    } catch (e) {
      console.warn('Could not push exhibits to Google Sheet', e);
      return false;
    }
  },

  // Votes
  getUserVote(memberRaw: string): VoteRecord | null {
    try {
      const norm = normalizeString(memberRaw);
      const raw = localStorage.getItem(VOTE_STORAGE_PREFIX + norm);
      if (raw) {
        return JSON.parse(raw);
      }
      // Also check legacy prefix if exists
      const rawLegacy = localStorage.getItem(LEGACY_VOTE_PREFIX + norm);
      if (rawLegacy) {
        return JSON.parse(rawLegacy);
      }
      // Check for legacy typo variant if "TRẦN ĐỨC NHÂN"
      if (norm === 'TRẦN ĐỨC NHÂN') {
        const rawTtran = localStorage.getItem(VOTE_STORAGE_PREFIX + 'TTRẦN ĐỨC NHÂN');
        if (rawTtran) return JSON.parse(rawTtran);
      }
    } catch (e) {
      console.error('Failed to get user vote', e);
    }
    return null;
  },

  saveUserVote(vote: VoteRecord): boolean {
    try {
      // 1. Save to local storage cache immediately
      const key = VOTE_STORAGE_PREFIX + normalizeString(vote.memberRaw);
      localStorage.setItem(key, JSON.stringify(vote));
      window.dispatchEvent(new Event('gallery-vote-updated'));

      // 2. Push to Google Sheets asynchronously if configured
      const gasUrl = this.getGasUrl();
      if (gasUrl) {
        this.pushVoteToGoogleSheets(vote, gasUrl);
      }

      return true;
    } catch (e) {
      console.error('Failed to save user vote', e);
      return false;
    }
  },

  // Async push to Google Apps Script Web App
  async pushVoteToGoogleSheets(vote: VoteRecord, gasUrl?: string): Promise<boolean> {
    const url = gasUrl || this.getGasUrl();
    if (!url) return false;

    try {
      // Send as text/plain JSON payload with no-cors mode to ensure Google Apps Script 302 redirect completes without CORS block
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'vote',
          memberRaw: vote.memberRaw,
          displayName: vote.displayName,
          groupNumber: vote.groupNumber,
          scores: vote.scores,
          timestamp: vote.timestamp,
        }),
      });
      return true;
    } catch (e) {
      console.warn('Could not push vote directly to Google Sheet, cached locally', e);
      return false;
    }
  },

  getAllVotes(): VoteRecord[] {
    const votes: VoteRecord[] = [];
    const seen = new Set<string>();

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(VOTE_STORAGE_PREFIX)) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const parsed: VoteRecord = JSON.parse(val);
              const norm = normalizeString(parsed.memberRaw);
              if (!seen.has(norm)) {
                seen.add(norm);
                votes.push(parsed);
              }
            } catch {
              // Ignore corrupt
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to get all votes', e);
    }
    return votes;
  },

  clearAllVotes(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(VOTE_STORAGE_PREFIX) ||
          key.startsWith('gallery_vote_v1:') ||
          key.startsWith('gallery_vote_v2:'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event('gallery-vote-updated'));
  },

  generateSampleVotes(count = 20): void {
    const availableMembers = RAW_MEMBERS.filter(
      (m) => !this.getUserVote(m)
    ).slice(0, count);

    availableMembers.forEach((member, i) => {
      // Assign group 1..4 in round robin
      const groupNumber = (i % 4) + 1;
      const scores: { [id: number]: number | null } = {
        1: null,
        2: null,
        3: null,
        4: null,
      };

      // Score for all groups except their own
      [1, 2, 3, 4].forEach((g) => {
        if (g !== groupNumber) {
          scores[g] = Math.floor(Math.random() * 4) + 7; // 7-10
        }
      });

      const vote: VoteRecord = {
        memberRaw: member,
        displayName: toTitleCase(member),
        groupNumber,
        scores,
        timestamp: new Date(
          Date.now() - Math.floor(Math.random() * 7200000)
        ).toISOString(),
      };
      this.saveUserVote(vote);
    });
  },

  exportToCSV(exhibits: Exhibit[]): void {
    const allVotes = this.getAllVotes();
    const headers = [
      'STT',
      'Họ và tên',
      'Tổ trực thuộc',
      ...exhibits.map((e) => `"${e.title} (Tổ ${e.groupNumber})"`),
      'Thời gian chấm',
    ];

    const rows = allVotes.map((v, idx) => {
      return [
        idx + 1,
        `"${v.displayName}"`,
        `"Tổ ${v.groupNumber}"`,
        ...exhibits.map((e) => {
          const s = v.scores[e.id];
          return s !== null && s !== undefined ? s : '(Tổ nhà - Không chấm)';
        }),
        `"${new Date(v.timestamp).toLocaleString('vi-VN')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ket_qua_cham_diem_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
