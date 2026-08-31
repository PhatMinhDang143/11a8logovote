import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Clock,
  Trophy,
  Users,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Exhibit, VoteRecord } from '../types';
import { storageService } from '../services/storageService';
import { STUDENTS_DATA } from '../data/initialData';

interface LiveBoardProps {
  exhibits: Exhibit[];
  onBackToVoting: () => void;
  onOpenLightbox: (exhibit: Exhibit) => void;
}

export const LiveBoard: React.FC<LiveBoardProps> = ({
  exhibits,
  onBackToVoting,
  onOpenLightbox,
}) => {
  const [allVotes, setAllVotes] = useState<VoteRecord[]>(() => storageService.getAllVotes());
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Countdown timer state (target: 18:00 today)
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  // Calculate target: 18:00:00 today
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(18, 0, 0, 0);

      const diffMs = target.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const totalSecs = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSecs / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;
        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      }
    };

    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to local votes update
  useEffect(() => {
    const handleUpdate = () => {
      setAllVotes(storageService.getAllVotes());
      setLastSyncTime(new Date());
    };
    window.addEventListener('gallery-vote-updated', handleUpdate);

    // Sync from Google Sheets periodically
    const syncInterval = setInterval(async () => {
      if (storageService.getGasUrl()) {
        setIsSyncing(true);
        await storageService.syncWithGoogleSheets();
        setAllVotes(storageService.getAllVotes());
        setLastSyncTime(new Date());
        setIsSyncing(false);
      }
    }, 6000);

    return () => {
      window.removeEventListener('gallery-vote-updated', handleUpdate);
      clearInterval(syncInterval);
    };
  }, []);

  // Manual refresh trigger
  const handleManualSync = async () => {
    setIsSyncing(true);
    if (storageService.getGasUrl()) {
      await storageService.syncWithGoogleSheets();
    }
    setAllVotes(storageService.getAllVotes());
    setLastSyncTime(new Date());
    setTimeout(() => setIsSyncing(false), 500);
  };

  // Copy direct live URL
  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'live');
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Rank statistics for each exhibit
  const rankedStats = useMemo(() => {
    return exhibits
      .map((exhibit) => {
        let sum = 0;
        let count = 0;
        const scoreCounts: { [score: number]: number } = {
          10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0,
        };

        allVotes.forEach((vote) => {
          if (!vote) return;
          const sc = vote.scores?.[exhibit.id];
          if (typeof sc === 'number' && sc > 0) {
            sum += sc;
            count += 1;
            scoreCounts[sc] = (scoreCounts[sc] || 0) + 1;
          }
        });

        const avg = count > 0 ? (sum / count) : 0;
        return {
          exhibit,
          sum,
          count,
          avg,
          scoreCounts,
        };
      })
      .sort((a, b) => b.avg - a.avg || b.sum - a.sum || b.count - a.count);
  }, [exhibits, allVotes]);

  // Turnout stats
  const totalStudents = STUDENTS_DATA.length; // 45
  const votedCount = allVotes.length;
  const turnoutPercent = Math.min(100, Math.round((votedCount / totalStudents) * 100));

  // Turnout per Group (Tổ 1..4)
  const groupTurnout = useMemo(() => {
    const counts: { [group: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };
    allVotes.forEach((v) => {
      if (v.groupNumber >= 1 && v.groupNumber <= 4) {
        counts[v.groupNumber] = (counts[v.groupNumber] || 0) + 1;
      }
    });
    return counts;
  }, [allVotes]);

  // Badges for ranks
  const rankMeta = [
    {
      title: 'HẠNG 1 — QUÁN QUÂN',
      badgeClass: 'bg-[#c9a227] text-[#1a1206] border-[#e0bc4a] font-bold shadow-[0_0_15px_rgba(201,162,39,0.4)]',
      cardClass: 'border-[#c9a227]/80 bg-gradient-to-b from-[#201b12] to-[#161a22]',
      scoreColor: 'text-[#f6d860]',
    },
    {
      title: 'HẠNG 2 — Á QUÂN',
      badgeClass: 'bg-[#b9bdc7] text-[#12161d] border-[#d8dce6] font-bold shadow-[0_0_12px_rgba(185,189,199,0.3)]',
      cardClass: 'border-[#8c94a4]/60 bg-gradient-to-b from-[#1c202a] to-[#141720]',
      scoreColor: 'text-[#e2e6f0]',
    },
    {
      title: 'HẠNG 3',
      badgeClass: 'bg-[#cd7f32] text-[#1a1206] border-[#e59b56] font-bold shadow-[0_0_10px_rgba(205,127,50,0.3)]',
      cardClass: 'border-[#cd7f32]/50 bg-gradient-to-b from-[#1f1915] to-[#141720]',
      scoreColor: 'text-[#e5a676]',
    },
    {
      title: 'HẠNG 4',
      badgeClass: 'bg-[#2a3444] text-[#b9bdc7] border-[#3e4c63] font-semibold',
      cardClass: 'border-[#333d4d] bg-[#161a22]',
      scoreColor: 'text-[#9aa2b2]',
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn pb-16 selection:bg-[#c9a227] selection:text-[#1a1206]">
      {/* TOP NAVIGATION & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#181d26] border border-[#333d4d] p-3 sm:p-4 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <button
          type="button"
          onClick={onBackToVoting}
          className="py-2 px-3.5 bg-[#262f3d] hover:bg-[#333d4d] text-[#f1ede3] text-xs font-mono flex items-center gap-2 border border-[#445063] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang Chấm Điểm</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Live indicator tag */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#12161d] border border-[#333d4d] text-xs font-mono">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e2725b] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#e2725b]"></span>
            </span>
            <span className="text-[#e2725b] font-bold tracking-wider uppercase">TRỰC TIẾP (LIVE)</span>
            <span className="text-[#6a7382]">|</span>
            <span className="text-[#8c94a4] hidden sm:inline">
              Cập nhật: {lastSyncTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-2 bg-[#262f3d] hover:bg-[#333d4d] text-[#b9bdc7] hover:text-[#f1ede3] border border-[#333d4d] transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu từ Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#e0bc4a]' : ''}`} />
          </button>

          {/* Copy Direct Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="py-2 px-3 bg-[#c9a227]/20 hover:bg-[#c9a227]/30 text-[#e0bc4a] border border-[#c9a227]/50 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sao chép đường link trực tiếp này"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép link!' : 'Copy Link Trực Tiếp'}</span>
          </button>

          {/* Fullscreen button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 bg-[#262f3d] hover:bg-[#333d4d] text-[#b9bdc7] hover:text-[#f1ede3] border border-[#333d4d] transition-colors cursor-pointer hidden md:block"
            title="Bật/Tắt toàn màn hình để chiếu máy chiếu"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* HERO BANNER & COUNTDOWN TO 18:00 */}
      <div className="relative overflow-hidden bg-[#181d26] border border-[#333d4d] p-5 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_0_1px_rgba(201,162,39,0.15)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#c9a227]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Main Title & Description */}
          <div className="lg:col-span-7 space-y-2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c9a227]/15 border border-[#c9a227]/40 text-[#e0bc4a] text-xs font-mono font-semibold uppercase tracking-widest">
              <Radio className="w-3.5 h-3.5 text-[#e0bc4a] animate-pulse" />
              Bảng Trực Tiếp Kết Quả — Lớp 11A8
            </div>
            <h1 className="font-serif italic text-2xl sm:text-4xl text-[#f1ede3] font-bold tracking-tight m-0">
              Triển Lãm &amp; Bình Chọn Tác Phẩm
            </h1>
            <p className="text-xs sm:text-sm text-[#b9bdc7] max-w-xl">
              Theo dõi bảng xếp hạng và điểm số thời gian thực của 4 Tổ. Dữ liệu được đồng bộ trực tiếp từ các phiếu chấm điểm của 45 học sinh.
            </p>
          </div>

          {/* COUNTDOWN CLOCK TO 18:00 */}
          <div className="lg:col-span-5 bg-[#12161d] border border-[#333d4d] p-4 sm:p-5 shadow-inner flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#c9a227]">
              <Clock className="w-4 h-4 text-[#e0bc4a]" />
              <span>{timeLeft.isExpired ? 'Thời gian bình chọn' : 'Thời gian đếm ngược (Hạn chót 18:00)'}</span>
            </div>

            {timeLeft.isExpired ? (
              <div className="py-2 px-4 bg-[#e2725b]/15 border border-[#e2725b]/40 text-[#e2725b] font-mono font-bold text-sm sm:text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>ĐÃ HẾT HẠN BÌNH CHỌN (18:00)</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                {/* Hours */}
                <div className="bg-[#1a202c] border border-[#333d4d] p-2.5 flex flex-col items-center">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#f1ede3]">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-mono text-[#8c94a4] uppercase mt-0.5">Giờ</span>
                </div>
                {/* Minutes */}
                <div className="bg-[#1a202c] border border-[#333d4d] p-2.5 flex flex-col items-center">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#e0bc4a]">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-mono text-[#8c94a4] uppercase mt-0.5">Phút</span>
                </div>
                {/* Seconds */}
                <div className="bg-[#1a202c] border border-[#333d4d] p-2.5 flex flex-col items-center">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#e2725b]">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-mono text-[#8c94a4] uppercase mt-0.5">Giây</span>
                </div>
              </div>
            )}

            <div className="text-[11px] font-mono text-[#8c94a4]">
              {timeLeft.isExpired ? 'Cổng bình chọn đã chính thức khép lại' : 'Hệ thống tự động chốt kết quả vào đúng 18:00 hôm nay'}
            </div>
          </div>
        </div>

        {/* TURNOUT PROGRESS BAR */}
        <div className="mt-6 pt-5 border-t border-[#333d4d]/80 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-4 flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[#b9bdc7]">
              <Users className="w-4 h-4 text-[#e0bc4a]" />
              <span>Tiến độ cả lớp:</span>
            </div>
            <span className="font-mono font-bold text-sm text-[#f1ede3]">
              <strong className="text-[#e0bc4a]">{votedCount}</strong> / {totalStudents} bạn ({turnoutPercent}%)
            </span>
          </div>

          <div className="sm:col-span-8 space-y-1.5">
            <div className="w-full h-3 bg-[#12161d] border border-[#333d4d] overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#c9a227] via-[#e0bc4a] to-[#4ade80] transition-all duration-700 shadow-[0_0_10px_rgba(201,162,39,0.5)]"
                style={{ width: `${turnoutPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-[#8c94a4]">
              <span>Tổ 1: <strong className="text-[#f1ede3]">{groupTurnout[1] || 0}</strong> phiếu</span>
              <span>Tổ 2: <strong className="text-[#f1ede3]">{groupTurnout[2] || 0}</strong> phiếu</span>
              <span>Tổ 3: <strong className="text-[#f1ede3]">{groupTurnout[3] || 0}</strong> phiếu</span>
              <span>Tổ 4: <strong className="text-[#f1ede3]">{groupTurnout[4] || 0}</strong> phiếu</span>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#e0bc4a]" />
            <h2 className="font-serif italic text-xl text-[#f1ede3] font-bold m-0">
              Bảng Xếp Hạng 4 Tổ
            </h2>
          </div>
          <span className="text-xs font-mono text-[#8c94a4]">
            (Sắp xếp theo Điểm Trung Bình thang 10)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rankedStats.map((item, index) => {
            const meta = rankMeta[index] || rankMeta[3];
            const maxScoreCount = Math.max(...Object.values(item.scoreCounts), 1);

            return (
              <div
                key={item.exhibit.id}
                className={`relative border p-5 shadow-[0_15px_35px_rgba(0,0,0,0.7)] transition-all flex flex-col justify-between ${meta.cardClass}`}
              >
                {/* Header Rank Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-mono border ${meta.badgeClass}`}>
                      {meta.title}
                    </span>
                    <span className="px-2 py-0.5 bg-[#12161d] text-[#b9bdc7] border border-[#333d4d] text-xs font-mono font-semibold">
                      TỔ {item.exhibit.groupNumber}
                    </span>
                  </div>

                  {/* Big Average Score Display */}
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-[#8c94a4] uppercase">Điểm trung bình</div>
                    <div className={`font-serif italic text-3xl sm:text-4xl font-extrabold tracking-tight ${meta.scoreColor}`}>
                      {item.count > 0 ? item.avg.toFixed(2) : '0.00'}
                      <span className="text-sm font-sans font-normal text-[#8c94a4] ml-1">/10</span>
                    </div>
                  </div>
                </div>

                {/* Exhibit Card Content */}
                <div className="grid grid-cols-12 gap-3 items-center my-2">
                  {/* Thumbnail */}
                  <div
                    onClick={() => onOpenLightbox(item.exhibit)}
                    className="col-span-4 aspect-square bg-[#0c0f14] border border-[#333d4d] overflow-hidden relative group cursor-pointer shadow-md"
                  >
                    <img
                      src={item.exhibit.url}
                      alt={item.exhibit.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Title & Stats */}
                  <div className="col-span-8 space-y-1.5 pl-1">
                    <h3 className="font-serif italic text-base sm:text-lg font-bold text-[#f1ede3] leading-snug line-clamp-1 m-0">
                      {item.exhibit.title}
                    </h3>
                    <p className="text-xs text-[#b9bdc7] font-mono">
                      Tác giả: <span className="text-[#e0bc4a]">{item.exhibit.artist || `Tập thể Tổ ${item.exhibit.groupNumber}`}</span>
                    </p>
                    <div className="flex items-center gap-3 text-xs font-mono text-[#8c94a4] pt-1">
                      <span>Tổng điểm: <strong className="text-[#f1ede3]">{item.sum}</strong></span>
                      <span>•</span>
                      <span>Lượt chấm: <strong className="text-[#e0bc4a]">{item.count}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Score Frequency Visualizer */}
                <div className="mt-4 pt-3 border-t border-[#333d4d]/60 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-[#8c94a4]">
                    <span>Phân bố điểm (1 → 10):</span>
                    <span>Điểm 10: <strong className="text-[#e0bc4a]">{item.scoreCounts[10] || 0}</strong> lượt</span>
                  </div>
                  <div className="grid grid-cols-10 gap-1 h-8 items-end bg-[#12161d] p-1 border border-[#333d4d]">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                      const count = item.scoreCounts[score] || 0;
                      const heightPercent = count > 0 ? Math.max(18, (count / maxScoreCount) * 100) : 0;
                      return (
                        <div key={score} className="h-full flex flex-col justify-end items-center group relative">
                          <div
                            className={`w-full transition-all ${
                              score === 10
                                ? 'bg-[#e0bc4a]'
                                : score >= 8
                                ? 'bg-[#c9a227]'
                                : score >= 5
                                ? 'bg-[#8c94a4]'
                                : 'bg-[#e2725b]'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className="text-[8px] font-mono text-[#6a7382] group-hover:text-white">
                            {score}
                          </span>
                          {count > 0 && (
                            <div className="absolute -top-7 bg-black text-[9px] font-mono text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                              {count} lượt
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
