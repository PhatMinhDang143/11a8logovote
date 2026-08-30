import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Lock,
  Download,
  Trash2,
  Sparkles,
  Users,
  BarChart3,
  Image as ImageIcon,
  Copy,
  Check,
  Trophy,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Cloud,
  RefreshCw,
  Code2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
  Upload,
} from 'lucide-react';
import { Exhibit, VoteRecord } from '../types';
import {
  ADMIN_PASSWORD,
  RAW_MEMBERS,
  STUDENTS_DATA,
  toTitleCase,
  normalizeString,
  formatImageUrl,
} from '../data/initialData';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../data/appsScriptCode';
import { storageService } from '../services/storageService';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  exhibits: Exhibit[];
  onUpdateExhibits: (newExhibits: Exhibit[]) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  exhibits,
  onUpdateExhibits,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'scores' | 'members' | 'sheets' | 'exhibits' | 'data'>('scores');
  const [copiedPending, setCopiedPending] = useState(false);
  const [copiedPinList, setCopiedPinList] = useState(false);
  const [pendingFilter, setPendingFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');

  // Google Sheets state
  const [gasUrlInput, setGasUrlInput] = useState(() => storageService.getGasUrl());
  const [isTestingGas, setIsTestingGas] = useState(false);
  const [isSyncingGas, setIsSyncingGas] = useState(false);
  const [gasTestResult, setGasTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => storageService.getLastSyncTime());

  // Editable exhibits state
  const [editableExhibits, setEditableExhibits] = useState<Exhibit[]>(exhibits);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // Synchronize gasUrlInput and exhibits when modal opens
  useEffect(() => {
    if (isOpen) {
      setGasUrlInput(storageService.getGasUrl());
      setLastSyncTime(storageService.getLastSyncTime());
      setEditableExhibits(exhibits);
    }
  }, [isOpen, exhibits]);

  // Live votes
  const allVotes = useMemo(() => {
    return storageService.getAllVotes();
  }, [isOpen, activeTab, isSyncingGas]);

  // Aggregate stats per exhibit
  const stats = useMemo(() => {
    return exhibits.map((exhibit) => {
      let sum = 0;
      let count = 0;
      const scoreDist: { [score: number]: number } = {};
      for (let s = 1; s <= 10; s++) scoreDist[s] = 0;

      allVotes.forEach((vote) => {
        const score = vote.scores[exhibit.id];
        if (typeof score === 'number') {
          sum += score;
          count += 1;
          scoreDist[score] = (scoreDist[score] || 0) + 1;
        }
      });

      const avg = count > 0 ? sum / count : 0;

      return {
        exhibit,
        count,
        sum,
        avg: avg > 0 ? avg.toFixed(2) : '—',
        avgNumber: avg,
        scoreDist,
      };
    });
  }, [exhibits, allVotes]);

  // Ranking sorted by Total Score first, then avg
  const rankedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      if (b.sum !== a.sum) return b.sum - a.sum;
      return b.avgNumber - a.avgNumber;
    });
  }, [stats]);

  // Members status
  const votedMap = useMemo(() => {
    const map = new Map<string, VoteRecord>();
    allVotes.forEach((v) => {
      map.set(normalizeString(v.memberRaw), v);
    });
    return map;
  }, [allVotes]);

  const notVotedMembers = useMemo(() => {
    return RAW_MEMBERS.filter((m) => !votedMap.has(normalizeString(m)));
  }, [votedMap]);

  const filteredPending = useMemo(() => {
    if (!pendingFilter.trim()) return notVotedMembers;
    const q = pendingFilter.toLowerCase().trim();
    return notVotedMembers.filter((name) =>
      name.toLowerCase().includes(q) || toTitleCase(name).toLowerCase().includes(q)
    );
  }, [notVotedMembers, pendingFilter]);

  const filteredAllStudents = useMemo(() => {
    if (!memberFilter.trim()) return STUDENTS_DATA;
    const q = memberFilter.toLowerCase().trim();
    return STUDENTS_DATA.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.birthDate.includes(q) ||
        s.pin.includes(q)
    );
  }, [memberFilter]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError('Mật khẩu không chính xác.');
    }
  };

  const handleCopyPending = () => {
    const listText = notVotedMembers.map((m, i) => `${i + 1}. ${toTitleCase(m)}`).join('\n');
    navigator.clipboard.writeText(
      `Danh sách chưa chấm điểm (${notVotedMembers.length}/${RAW_MEMBERS.length}):\n${listText}`
    );
    setCopiedPending(true);
    setTimeout(() => setCopiedPending(false), 2000);
  };

  const handleCopyPinList = () => {
    const text = STUDENTS_DATA.map(
      (s, i) => `${i + 1}. ${toTitleCase(s.name)} — Ngày sinh: ${s.birthDate} — PIN: ${s.pin}`
    ).join('\n');
    navigator.clipboard.writeText(`DANH SÁCH HỌC SINH & MẬT KHẨU (PIN 4 SỐ):\n${text}`);
    setCopiedPinList(true);
    setTimeout(() => setCopiedPinList(false), 2000);
  };

  const handleFileUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      // Compress and resize image so it can sync safely across Google Sheets and devices
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDimension = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          const updated = [...editableExhibits];
          updated[idx] = { ...updated[idx], url: compressedDataUrl };
          setEditableExhibits(updated);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveExhibits = () => {
    onUpdateExhibits(editableExhibits);
    storageService.saveExhibits(editableExhibits);
    setSaveSuccessMessage('Đã cập nhật tác phẩm thành công!');
    setTimeout(() => setSaveSuccessMessage(''), 2500);
  };

  const handleTestAndSaveGasUrl = async () => {
    setIsTestingGas(true);
    setGasTestResult(null);
    const result = await storageService.testGoogleSheetConnection(gasUrlInput);
    setIsTestingGas(false);
    setGasTestResult(result);
    if (result.success) {
      storageService.setGasUrl(gasUrlInput);
      setLastSyncTime(new Date().toISOString());
      await storageService.syncWithGoogleSheets();
    }
  };

  const handleDisconnectGas = () => {
    if (window.confirm('Bạn có chắc chắn muốn ngắt kết nối với Google Sheet này?')) {
      storageService.setGasUrl('');
      setGasUrlInput('');
      setGasTestResult(null);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncingGas(true);
    const res = await storageService.syncWithGoogleSheets();
    setIsSyncingGas(false);
    if (res.success) {
      setLastSyncTime(new Date().toISOString());
      setGasTestResult({
        success: true,
        message: `Đã đồng bộ thành công ${res.count} phiếu chấm từ Google Sheet!`,
      });
    } else {
      setGasTestResult({
        success: false,
        message: res.error || 'Đồng bộ thất bại. Vui lòng kiểm tra lại URL Apps Script.',
      });
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0a0c10]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-[#181d26] border border-[#333d4d] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333d4d] bg-[#1e2531]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c9a227]/20 border border-[#c9a227]/50 flex items-center justify-center text-[#e0bc4a]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif italic text-lg text-[#f1ede3] font-semibold m-0">
                Bảng điều khiển Ban tổ chức
              </h3>
              <p className="text-[11px] text-[#b9bdc7] font-mono">
                Quản lý tác phẩm • Xem mật khẩu học sinh • Đồng bộ Google Sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#b9bdc7] hover:text-[#f1ede3] hover:bg-[#262f3d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {!isAuthenticated ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#262f3d] border border-[#333d4d] flex items-center justify-center text-[#e0bc4a] mb-4 shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-serif italic text-xl text-[#f1ede3] mb-1">
              Xác thực Ban giám khảo / Quản trị viên
            </h4>
            <p className="text-xs text-[#b9bdc7] max-w-xs mb-6">
              Vui lòng nhập mật khẩu quản trị để mở bảng điều khiển.
            </p>

            <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full px-4 py-2.5 text-sm bg-[#12161d] border border-[#333d4d] rounded-xl text-[#f1ede3] placeholder-[#6a7382] focus:outline-none focus:border-[#e0bc4a]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#b9bdc7] hover:text-[#f1ede3]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authError && (
                <div className="text-xs text-[#e2725b] font-medium text-left">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-b from-[#e0bc4a] to-[#c9a227] text-[#1a1206] shadow-md hover:brightness-105 transition-all"
              >
                Mở khóa quản trị
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Navigation Tabs */}
            <div className="flex border-b border-[#333d4d] px-6 bg-[#181d26] overflow-x-auto gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('scores')}
                className={`py-3 px-3.5 text-xs font-mono uppercase tracking-wider border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'scores'
                    ? 'border-[#c9a227] text-[#e0bc4a] font-semibold'
                    : 'border-transparent text-[#b9bdc7] hover:text-[#f1ede3]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Bảng Tổng Điểm ({allVotes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className={`py-3 px-3.5 text-xs font-mono uppercase tracking-wider border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'members'
                    ? 'border-[#c9a227] text-[#e0bc4a] font-semibold'
                    : 'border-transparent text-[#b9bdc7] hover:text-[#f1ede3]'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Học sinh &amp; Mật khẩu PIN
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sheets')}
                className={`py-3 px-3.5 text-xs font-mono uppercase tracking-wider border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'sheets'
                    ? 'border-[#c9a227] text-[#e0bc4a] font-semibold'
                    : 'border-transparent text-[#b9bdc7] hover:text-[#f1ede3]'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-[#6f9c86]" /> Google Sheets
                {storageService.getGasUrl() && (
                  <span className="w-2 h-2 rounded-full bg-[#6f9c86] animate-pulse"></span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('exhibits')}
                className={`py-3 px-3.5 text-xs font-mono uppercase tracking-wider border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'exhibits'
                    ? 'border-[#c9a227] text-[#e0bc4a] font-semibold'
                    : 'border-transparent text-[#b9bdc7] hover:text-[#f1ede3]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Ảnh tác phẩm 4 Tổ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('data')}
                className={`py-3 px-3.5 text-xs font-mono uppercase tracking-wider border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'data'
                    ? 'border-[#c9a227] text-[#e0bc4a] font-semibold'
                    : 'border-transparent text-[#b9bdc7] hover:text-[#f1ede3]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Dữ liệu &amp; Xuất CSV
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto flex-1 max-h-[calc(85vh-160px)]">
              {/* TAB 1: RANKINGS & SCORES */}
              {activeTab === 'scores' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rankedStats.map((item, rank) => {
                      const rankBadges = [
                        'bg-[#c9a227]/20 text-[#e0bc4a] border-[#c9a227]',
                        'bg-[#6b7280]/20 text-[#d1d5db] border-[#9ca3af]',
                        'bg-[#b45309]/20 text-[#d97706] border-[#d97706]',
                        'bg-[#262f3d] text-[#b9bdc7] border-[#333d4d]',
                      ];

                      const imgUrl = formatImageUrl(item.exhibit.url);

                      return (
                        <div
                          key={item.exhibit.id}
                          className="bg-[#12161d] p-4 rounded-xl border border-[#333d4d] flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-6 h-6 rounded-md flex items-center justify-center font-mono text-xs font-bold border ${
                                  rankBadges[rank] || rankBadges[3]
                                }`}
                              >
                                {rank + 1}
                              </span>
                              <div>
                                <h5 className="font-serif italic text-sm font-semibold text-[#f1ede3] m-0">
                                  Tác phẩm Tổ {item.exhibit.groupNumber}
                                </h5>
                                <span className="text-[10px] font-mono text-[#e0bc4a]">
                                  Tổ {item.exhibit.groupNumber}
                                </span>
                              </div>
                            </div>

                            <div className="text-right font-mono">
                              <span className="text-lg font-bold text-[#e0bc4a]">
                                {item.sum}
                              </span>
                              <span className="text-[10px] text-[#b9bdc7] block">
                                ĐTB: {item.avg}/10
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-24 rounded-lg overflow-hidden border border-[#333d4d] bg-[#0c0f14]">
                            <img
                              src={imgUrl}
                              alt={`Tác phẩm Tổ ${item.exhibit.groupNumber}`}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Score distribution bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono text-[#b9bdc7]">
                              <span>Phân bố điểm (1→10)</span>
                              <span>{item.count} phiếu chấm</span>
                            </div>
                            <div className="flex gap-0.5 h-3 bg-[#181d26] rounded p-0.5 border border-[#333d4d]/40">
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((scoreVal) => {
                                const c = item.scoreDist[scoreVal] || 0;
                                const widthPct = item.count > 0 ? (c / item.count) * 100 : 0;
                                return (
                                  <div
                                    key={scoreVal}
                                    style={{ width: `${widthPct}%` }}
                                    title={`Điểm ${scoreVal}: ${c} phiếu`}
                                    className={`h-full rounded-xs transition-all ${
                                      c > 0 ? 'bg-[#c9a227]' : 'bg-transparent'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: MEMBERS & PIN CODES */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  {/* Summary & Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#12161d] p-3.5 rounded-xl border border-[#333d4d]">
                    <div>
                      <span className="text-xs font-mono text-[#e0bc4a] font-semibold block flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5" /> Danh sách 45 học sinh &amp; Mật khẩu ngày sinh
                      </span>
                      <span className="text-[11px] text-[#b9bdc7]">
                        Đã nộp: <strong className="text-[#6f9c86]">{allVotes.length}</strong> / 45 • Chưa nộp: <strong className="text-[#e2725b]">{notVotedMembers.length}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyPinList}
                        className="py-1.5 px-3 rounded-lg text-xs font-mono bg-[#262f3d] hover:bg-[#333d4d] text-[#f1ede3] border border-[#333d4d] flex items-center gap-1.5 transition-colors"
                      >
                        {copiedPinList ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#6f9c86]" /> Đã sao chép!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#c9a227]" /> Sao chép toàn bộ PIN
                          </>
                        )}
                      </button>

                      {notVotedMembers.length > 0 && (
                        <button
                          type="button"
                          onClick={handleCopyPending}
                          className="py-1.5 px-3 rounded-lg text-xs font-mono bg-[#e2725b]/10 hover:bg-[#e2725b]/20 text-[#e2725b] border border-[#e2725b]/30 flex items-center gap-1.5 transition-colors"
                        >
                          {copiedPending ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#6f9c86]" /> Đã sao chép!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Sao chép {notVotedMembers.length} bạn chưa nộp
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search Filter */}
                  <input
                    type="text"
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    placeholder="Tìm theo tên học sinh, ngày sinh hoặc mã PIN (4 số)..."
                    className="w-full px-3.5 py-2 text-xs bg-[#12161d] border border-[#333d4d] rounded-xl text-[#f1ede3] placeholder-[#6a7382] focus:outline-none focus:border-[#c9a227]"
                  />

                  {/* Student Table */}
                  <div className="bg-[#12161d] rounded-xl border border-[#333d4d] overflow-hidden">
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-[#262f3d]/60">
                      {filteredAllStudents.map((s, idx) => {
                        const voted = votedMap.get(normalizeString(s.name));
                        return (
                          <div
                            key={s.name}
                            className="p-2.5 px-3.5 flex items-center justify-between gap-2 hover:bg-[#181d26] transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-[10px] font-mono text-[#b9bdc7] w-5 shrink-0">
                                {idx + 1}.
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium text-[#f1ede3] truncate m-0">
                                  {toTitleCase(s.name)}
                                </p>
                                <span className="text-[11px] text-[#b9bdc7] font-mono">
                                  Ngày sinh: {s.birthDate}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 font-mono">
                              <div className="bg-[#181d26] px-2.5 py-1 rounded-md border border-[#c9a227]/40 text-[#e0bc4a] text-xs font-bold tracking-wider">
                                PIN: {s.pin}
                              </div>

                              {voted ? (
                                <span className="text-[11px] text-[#6f9c86] bg-[#6f9c86]/10 px-2 py-0.5 rounded-full border border-[#6f9c86]/30">
                                  Đã nộp (Tổ {voted.groupNumber})
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#e2725b] bg-[#e2725b]/10 px-2 py-0.5 rounded-full border border-[#e2725b]/30">
                                  Chưa nộp
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: GOOGLE SHEETS & APPS SCRIPT */}
              {activeTab === 'sheets' && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="bg-[#12161d] p-4 rounded-xl border border-[#333d4d] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            storageService.getGasUrl() ? 'bg-[#6f9c86] animate-pulse' : 'bg-[#e2725b]'
                          }`}
                        />
                        <h5 className="text-sm font-semibold text-[#f1ede3] m-0">
                          {storageService.getGasUrl()
                            ? 'Đã kết nối cơ sở dữ liệu Google Sheets'
                            : 'Chưa liên kết Google Sheets'}
                        </h5>
                      </div>

                      {storageService.getGasUrl() && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSyncNow}
                            disabled={isSyncingGas}
                            className="py-1 px-3 rounded-lg text-xs font-mono bg-[#262f3d] hover:bg-[#333d4d] text-[#e0bc4a] border border-[#333d4d] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGas ? 'animate-spin' : ''}`} />
                            {isSyncingGas ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                          </button>

                          <button
                            type="button"
                            onClick={handleDisconnectGas}
                            className="py-1 px-2.5 rounded-lg text-xs font-mono bg-[#e2725b]/10 hover:bg-[#e2725b]/20 text-[#e2725b] border border-[#e2725b]/30 transition-colors"
                          >
                            Ngắt kết nối
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-[#b9bdc7] leading-relaxed">
                      Khi học sinh chấm điểm từ điện thoại hay máy tính cá nhân, toàn bộ kết quả sẽ được tự động gửi và lưu trực tiếp vào trang tính Google Sheet của bạn.
                    </p>

                    {lastSyncTime && (
                      <div className="text-[11px] font-mono text-[#6f9c86]">
                        Đồng bộ gần nhất: {new Date(lastSyncTime).toLocaleTimeString('vi-VN')} ({new Date(lastSyncTime).toLocaleDateString('vi-VN')})
                      </div>
                    )}
                  </div>

                  {/* URL Configuration Form */}
                  <div className="bg-[#12161d] p-4 rounded-xl border border-[#333d4d] space-y-3">
                    <label className="text-xs font-mono text-[#e0bc4a] block font-semibold">
                      URL Ứng dụng Web Google Apps Script (Web App URL):
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={gasUrlInput}
                        onChange={(e) => setGasUrlInput(e.target.value)}
                        placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                        className="flex-1 px-3 py-2 text-xs bg-[#181d26] border border-[#333d4d] rounded-lg text-[#f1ede3] placeholder-[#6a7382] focus:outline-none focus:border-[#c9a227] font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleTestAndSaveGasUrl}
                        disabled={isTestingGas || !gasUrlInput.trim()}
                        className="py-2 px-4 rounded-lg text-xs font-semibold bg-gradient-to-b from-[#e0bc4a] to-[#c9a227] text-[#1a1206] hover:brightness-105 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        {isTestingGas ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang kiểm tra...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lưu &amp; Kiểm tra kết nối
                          </>
                        )}
                      </button>
                    </div>

                    {gasTestResult && (
                      <div
                        className={`p-3 rounded-lg text-xs border flex items-start gap-2 ${
                          gasTestResult.success
                            ? 'bg-[#6f9c86]/15 border-[#6f9c86]/40 text-[#6f9c86]'
                            : 'bg-[#e2725b]/15 border-[#e2725b]/40 text-[#e2725b]'
                        }`}
                      >
                        {gasTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span>{gasTestResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* 4 Steps Instructions */}
                  <div className="bg-[#12161d] p-4 rounded-xl border border-[#333d4d] space-y-3">
                    <h5 className="text-xs font-mono uppercase tracking-wider text-[#e0bc4a] font-semibold flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" /> Hướng dẫn tạo Google Apps Script trong 2 phút:
                    </h5>

                    <ol className="space-y-2.5 text-xs text-[#b9bdc7] list-none pl-0">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#262f3d] text-[#e0bc4a] font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#333d4d]">
                          1
                        </span>
                        <span>
                          Tạo một Google Sheet mới tại <strong className="text-[#f1ede3]">sheets.google.com</strong>.
                        </span>
                      </li>

                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#262f3d] text-[#e0bc4a] font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#333d4d]">
                          2
                        </span>
                        <span>
                          Trên thanh menu Google Sheet, chọn <strong className="text-[#f1ede3]">Tiện ích mở rộng (Extensions)</strong> &gt; <strong className="text-[#f1ede3]">Apps Script</strong>.
                        </span>
                      </li>

                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#262f3d] text-[#e0bc4a] font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#333d4d]">
                          3
                        </span>
                        <span>
                          Xóa hết code mặc định trong file <code className="text-[#e0bc4a] bg-[#181d26] px-1 py-0.5 rounded">Code.gs</code>, sau đó bấm nút <strong className="text-[#f1ede3]">"Sao chép mã Apps Script"</strong> ở ô bên dưới và dán vào. Nhấn <strong className="text-[#f1ede3]">Lưu (Save)</strong>.
                        </span>
                      </li>

                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#262f3d] text-[#e0bc4a] font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-[#333d4d]">
                          4
                        </span>
                        <span>
                          Bấm nút <strong className="text-[#e0bc4a]">Triển khai (Deploy)</strong> ở góc trên bên phải &gt; <strong className="text-[#f1ede3]">Tùy chọn triển khai mới (New deployment)</strong> &gt; Chọn loại <strong className="text-[#f1ede3]">Ứng dụng web (Web app)</strong>. Ở mục <em>Ai có quyền truy cập (Who has access)</em>, chọn <strong className="text-[#6f9c86]">Bất kỳ ai (Anyone)</strong> &gt; Nhấn <strong className="text-[#f1ede3]">Triển khai</strong> và dán link Web App vừa nhận được vào ô URL phía trên.
                        </span>
                      </li>
                    </ol>
                  </div>

                  {/* Code box */}
                  <div className="bg-[#12161d] p-4 rounded-xl border border-[#333d4d] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#f1ede3] font-semibold flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-[#c9a227]" /> Mã nguồn Google Apps Script (Code.gs):
                      </span>

                      <button
                        type="button"
                        onClick={handleCopyScript}
                        className="py-1.5 px-3 rounded-lg text-xs font-mono bg-[#262f3d] hover:bg-[#333d4d] text-[#f1ede3] border border-[#333d4d] flex items-center gap-1.5 transition-colors"
                      >
                        {copiedScript ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#6f9c86]" /> Đã sao chép mã!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#c9a227]" /> Sao chép toàn bộ mã
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="max-h-48 overflow-y-auto p-3 bg-[#0a0c10] border border-[#333d4d]/60 rounded-lg text-[11px] font-mono text-[#b9bdc7] select-all leading-relaxed">
                      {GOOGLE_APPS_SCRIPT_TEMPLATE}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: EXHIBIT MANAGEMENT */}
              {activeTab === 'exhibits' && (
                <div className="space-y-4">
                  <div className="bg-[#12161d] p-3.5 rounded-xl border border-[#333d4d] space-y-1.5">
                    <p className="text-xs text-[#e0bc4a] font-mono font-semibold">
                      Cách thêm ảnh tác phẩm:
                    </p>
                    <ul className="text-xs text-[#b9bdc7] space-y-1 list-disc pl-4">
                      <li>
                        <strong className="text-[#f1ede3]">Cách 1: Tải ảnh từ máy</strong> — Bấm nút <em>"Chọn ảnh từ máy"</em> để tải ảnh trực tiếp từ điện thoại hoặc máy tính.
                      </li>
                      <li>
                        <strong className="text-[#f1ede3]">Cách 2: Dán link Google Drive</strong> — Mở ảnh trên Google Drive &gt; Bấm Chia sẻ &gt; Đặt quyền <em>"Bất kỳ ai có liên kết đều có thể xem"</em> &gt; Sao chép liên kết và dán vào ô bên dưới.
                      </li>
                    </ul>
                  </div>

                  {editableExhibits.map((ex, idx) => {
                    const previewUrl = formatImageUrl(ex.url);
                    return (
                      <div
                        key={ex.id}
                        className="bg-[#12161d] p-4 rounded-xl border border-[#333d4d] space-y-3"
                      >
                        <div className="flex items-center justify-between font-mono text-xs text-[#c9a227] font-semibold">
                          <span>Tác phẩm Tổ {ex.groupNumber}</span>
                          <span className="text-[#e0bc4a] bg-[#c9a227]/15 px-2 py-0.5 rounded border border-[#c9a227]/40">
                            Tổ {ex.groupNumber}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Image preview */}
                          <div className="sm:col-span-1">
                            <label className="text-[11px] text-[#b9bdc7] font-mono block mb-1">
                              Xem trước:
                            </label>
                            <div className="h-28 rounded-lg overflow-hidden border border-[#333d4d] bg-[#0c0f14] flex items-center justify-center">
                              {previewUrl ? (
                                <img
                                  src={previewUrl}
                                  alt={`Tổ ${ex.groupNumber}`}
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[11px] text-[#6a7382] italic">Chưa có ảnh</span>
                              )}
                            </div>
                          </div>

                          {/* URL & Upload */}
                          <div className="sm:col-span-2 space-y-2">
                            <div>
                              <label className="text-[11px] text-[#b9bdc7] font-mono block mb-1">
                                Link Google Drive hoặc URL ảnh:
                              </label>
                              <input
                                type="text"
                                value={ex.url}
                                onChange={(e) => {
                                  const updated = [...editableExhibits];
                                  updated[idx] = { ...updated[idx], url: e.target.value };
                                  setEditableExhibits(updated);
                                }}
                                placeholder="Dán link Google Drive hoặc URL ảnh..."
                                className="w-full px-3 py-2 text-xs bg-[#181d26] border border-[#333d4d] rounded-lg text-[#f1ede3] placeholder-[#6a7382] focus:outline-none focus:border-[#c9a227] font-mono"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer py-1.5 px-3 rounded-lg text-xs font-mono bg-[#262f3d] hover:bg-[#333d4d] text-[#e0bc4a] border border-[#333d4d] flex items-center gap-1.5 transition-colors">
                                <Upload className="w-3.5 h-3.5" /> Chọn ảnh từ máy
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(idx, e)}
                                />
                              </label>
                              <span className="text-[10px] text-[#6a7382] font-mono">
                                (Hỗ trợ JPG, PNG, WebP)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {saveSuccessMessage && (
                    <div className="p-2.5 rounded-xl bg-[#6f9c86]/20 border border-[#6f9c86] text-xs text-[#6f9c86] font-medium text-center">
                      {saveSuccessMessage}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveExhibits}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-b from-[#e0bc4a] to-[#c9a227] text-[#1a1206] shadow-md hover:shadow-lg transition-all"
                  >
                    Lưu cập nhật tác phẩm
                  </button>
                </div>
              )}

              {/* TAB 4: DATA EXPORT & ACTIONS */}
              {activeTab === 'data' && (
                <div className="space-y-4">
                  <div className="bg-[#12161d] p-4 rounded-xl border border-[#333d4d] space-y-2">
                    <h5 className="text-sm font-semibold text-[#f1ede3] flex items-center gap-2">
                      <Download className="w-4 h-4 text-[#c9a227]" /> Xuất tệp báo cáo CSV
                    </h5>
                    <p className="text-xs text-[#b9bdc7] leading-relaxed">
                      Tải về bảng tổng hợp điểm chi tiết từng thành viên đã chấm, phân loại theo từng Tổ, kèm thời gian nộp bài dưới định dạng CSV (tương thích hoàn toàn với Microsoft Excel, Google Sheets).
                    </p>
                    <button
                      type="button"
                      onClick={() => storageService.exportToCSV(exhibits)}
                      disabled={allVotes.length === 0}
                      className="mt-2 py-2 px-4 rounded-xl text-xs font-semibold bg-[#262f3d] hover:bg-[#333d4d] text-[#f1ede3] border border-[#333d4d] flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" /> Tải về CSV ({allVotes.length} bản ghi)
                    </button>
                  </div>

                  {/* Testing tools */}
                  <div className="bg-[#12161d] p-4 rounded-xl border border-[#333d4d] space-y-3">
                    <h5 className="text-sm font-semibold text-[#f1ede3] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#e0bc4a]" /> Công cụ kiểm thử (Demo)
                    </h5>
                    <p className="text-xs text-[#b9bdc7]">
                      Tự động tạo các phiếu chấm mẫu tuân thủ đúng quy chế: thành viên Tổ X chỉ chấm các tổ còn lại.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          storageService.generateSampleVotes(16);
                          setActiveTab('scores');
                        }}
                        className="py-2 px-3 rounded-lg text-xs font-mono bg-[#262f3d] hover:bg-[#333d4d] text-[#e0bc4a] border border-[#333d4d] flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> +16 phiếu mẫu theo Tổ
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ kết quả chấm điểm hiện tại?')) {
                            storageService.clearAllVotes();
                            setActiveTab('scores');
                          }
                        }}
                        className="py-2 px-3 rounded-lg text-xs font-mono bg-[#e2725b]/10 hover:bg-[#e2725b]/20 text-[#e2725b] border border-[#e2725b]/30 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả điểm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#333d4d] bg-[#1e2531] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl text-xs font-mono uppercase tracking-wider text-[#b9bdc7] hover:text-[#f1ede3] hover:bg-[#262f3d] border border-[#333d4d] transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
