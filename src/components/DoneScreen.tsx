import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Star,
  Users,
  Search,
  LogOut,
  Trophy,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { Exhibit } from '../types';
import { RAW_MEMBERS, toTitleCase, normalizeString, formatImageUrl } from '../data/initialData';
import { storageService } from '../services/storageService';

interface DoneScreenProps {
  currentUser: string;
  userGroup: number;
  alreadyVoted: boolean;
  exhibits: Exhibit[];
  onResetUser: () => void;
  onOpenLive?: () => void;
}

export const DoneScreen: React.FC<DoneScreenProps> = ({
  currentUser,
  userGroup,
  alreadyVoted,
  exhibits,
  onResetUser,
  onOpenLive,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const [voteVersion, setVoteVersion] = useState(0);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Re-fetch votes when voteVersion updates or storage event occurs
  useEffect(() => {
    const handleUpdate = () => setVoteVersion((v) => v + 1);
    window.addEventListener('gallery-vote-updated', handleUpdate);
    return () => window.removeEventListener('gallery-vote-updated', handleUpdate);
  }, []);

  const handleManualRefresh = async () => {
    setIsManualSyncing(true);
    if (storageService.getGasUrl()) {
      await storageService.syncWithGoogleSheets();
    }
    setVoteVersion((v) => v + 1);
    setTimeout(() => setIsManualSyncing(false), 500);
  };

  // Live votes
  const allVotes = useMemo(() => storageService.getAllVotes(), [voteVersion]);
  const myVote = useMemo(() => storageService.getUserVote(currentUser), [currentUser, voteVersion]);

  // Aggregate stats per exhibit
  const exhibitStats = useMemo(() => {
    return exhibits.map((exhibit) => {
      let sum = 0;
      let count = 0;

      allVotes.forEach((vote) => {
        const score = vote.scores?.[exhibit.id];
        if (typeof score === 'number') {
          sum += score;
          count += 1;
        }
      });

      const avg = count > 0 ? sum / count : 0;

      return {
        exhibit,
        totalScore: sum,
        voteCount: count,
        avgScore: avg > 0 ? avg.toFixed(2) : '—',
        avgNumber: avg,
      };
    });
  }, [exhibits, allVotes]);

  // Sort by Total Score for live leaderboard
  const rankedExhibits = useMemo(() => {
    return [...exhibitStats].sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.avgNumber - a.avgNumber;
    });
  }, [exhibitStats]);

  // Participation count
  const votedMemberRaws = useMemo(
    () => new Set(allVotes.map((v) => normalizeString(v.memberRaw))),
    [allVotes]
  );

  const totalMembers = RAW_MEMBERS.length;
  const votedCount = votedMemberRaws.size;
  const percentage = Math.round((votedCount / totalMembers) * 100);

  // Filtered voters list
  const votedList = useMemo(() => {
    return allVotes.map((v) => ({
      name: v.displayName,
      raw: v.memberRaw,
      groupNumber: v.groupNumber || 1,
      time: v.timestamp,
    }));
  }, [allVotes]);

  const filteredVoted = useMemo(() => {
    if (!searchTerm.trim()) return votedList;
    const q = searchTerm.toLowerCase().trim();
    return votedList.filter((v) =>
      v.name.toLowerCase().includes(q) || v.raw.toLowerCase().includes(q)
    );
  }, [votedList, searchTerm]);

  return (
    <div className="w-full max-w-[580px] bg-gradient-to-b from-[#1c222c] to-[#12161d] border border-[#333d4d] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(201,162,39,0.15)] transition-all space-y-6">
      {/* 1. STATUS HEADER */}
      <div className="text-center">
        <div
          className={`w-14 h-14 mx-auto mb-3 flex items-center justify-center text-2xl border shadow-lg ${
            alreadyVoted
              ? 'bg-[#c9a227]/15 border-[#c9a227] text-[#e0bc4a]'
              : 'bg-[#6f9c86]/15 border-[#6f9c86] text-[#6f9c86]'
          }`}
        >
          {alreadyVoted ? <Star className="w-7 h-7 fill-[#e0bc4a]" /> : <CheckCircle2 className="w-7 h-7" />}
        </div>

        <h2 className="font-serif italic text-2xl m-0 mb-1.5 text-[#f1ede3]">
          {alreadyVoted ? `Chào ${toTitleCase(currentUser)}!` : 'Cảm ơn bạn đã chấm điểm!'}
        </h2>

        <p className="text-[#b9bdc7] text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
          {alreadyVoted
            ? `Bạn (${toTitleCase(currentUser)} • Tổ ${userGroup}) đã hoàn tất đánh giá trước đó.`
            : `Đánh giá từ ${toTitleCase(currentUser)} (Tổ ${userGroup}) đã được ghi nhận thành công.`}
        </p>

        {/* My submitted score summary */}
        {myVote && (
          <div className="mt-3 p-3 bg-[#12161d] border border-[#333d4d] inline-flex flex-wrap items-center justify-center gap-2 text-xs font-mono shadow-inner">
            <span className="text-[#b9bdc7]">Điểm bạn đã chấm:</span>
            {exhibits.map((ex) => {
              const score = myVote.scores?.[ex.id];
              if (ex.groupNumber === userGroup) {
                return (
                  <span
                    key={ex.id}
                    className="px-2 py-0.5 bg-[#181d26] text-[#b9bdc7]/50 border border-[#333d4d]/40"
                  >
                    Tổ {ex.groupNumber}: Tổ của bạn
                  </span>
                );
              }
              return (
                <span
                  key={ex.id}
                  className="px-2 py-0.5 bg-[#c9a227]/15 text-[#e0bc4a] border border-[#c9a227]/40 font-semibold"
                >
                  Tổ {ex.groupNumber}: {score !== null ? `${score}đ` : '—'}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. BẢNG TỔNG ĐIỂM HIỆN TẠI (LIVE LEADERBOARD) */}
      <div className="bg-[#12161d] border border-[#333d4d] p-4 sm:p-5 shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-[#333d4d]/60">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#e0bc4a]" />
            <h3 className="font-serif italic text-base sm:text-lg text-[#f1ede3] font-semibold m-0">
              Bảng Tổng Điểm Hiện Tại
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isManualSyncing}
              title="Làm mới bảng điểm từ Google Sheets"
              className="p-1 px-2 text-[11px] font-mono bg-[#181d26] hover:bg-[#262f3d] text-[#b9bdc7] hover:text-[#e0bc4a] border border-[#333d4d] flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin text-[#e0bc4a]' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <span className="text-[11px] font-mono text-[#c9a227] bg-[#c9a227]/10 px-2 py-0.5 border border-[#c9a227]/30">
              {votedCount} lượt đã chấm
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {rankedExhibits.map((item, rank) => {
            const isUserGroupArtwork = item.exhibit.groupNumber === userGroup;
            const rankColors = [
              'text-[#e0bc4a] bg-[#c9a227]/20 border-[#c9a227]', // Top 1 Gold
              'text-[#d1d5db] bg-[#6b7280]/20 border-[#9ca3af]', // Top 2 Silver
              'text-[#d97706] bg-[#b45309]/20 border-[#d97706]', // Top 3 Bronze
              'text-[#b9bdc7] bg-[#262f3d] border-[#333d4d]',      // Top 4
            ];

            const imgUrl = formatImageUrl(item.exhibit.url);

            return (
              <div
                key={item.exhibit.id}
                className={`p-3 border flex items-center justify-between gap-3 transition-all ${
                  isUserGroupArtwork
                    ? 'bg-[#181d26] border-[#c9a227]/50 shadow-[0_4px_16px_rgba(201,162,39,0.15)]'
                    : 'bg-[#181d26]/80 border-[#333d4d]'
                }`}
              >
                {/* Left: Rank & Artwork info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 border flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                      rankColors[rank] || rankColors[3]
                    }`}
                  >
                    #{rank + 1}
                  </div>

                  <div className="w-10 h-10 overflow-hidden border border-[#333d4d] shrink-0 bg-[#0c0f14]">
                    <img
                      src={imgUrl}
                      alt={`Tác phẩm Tổ ${item.exhibit.groupNumber}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-[#e0bc4a]">
                        Tác phẩm Tổ {item.exhibit.groupNumber}
                      </span>
                      {isUserGroupArtwork && (
                        <span className="text-[10px] bg-[#c9a227]/20 text-[#e0bc4a] border border-[#c9a227]/40 px-1.5 py-0.2 font-mono">
                          Tổ của bạn
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#b9bdc7] font-mono block mt-0.5">
                      {item.voteCount} lượt chấm
                    </span>
                  </div>
                </div>

                {/* Right: Total Score & Average */}
                <div className="text-right shrink-0">
                  <div className="flex items-baseline justify-end gap-1 font-mono">
                    <span className="text-lg sm:text-xl font-bold text-[#e0bc4a]">
                      {item.totalScore}
                    </span>
                    <span className="text-xs text-[#b9bdc7]">điểm</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#6f9c86]">
                    ĐTB: <strong>{item.avgScore}</strong>/10
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TIẾN ĐỘ THAM GIA */}
      <div className="bg-[#12161d] border border-[#333d4d] p-4 shadow-inner">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-[#b9bdc7] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#c9a227]" />
            Tiến độ thành viên đã chấm:
          </span>
          <span className="text-[#e0bc4a] font-bold">
            {votedCount} / {totalMembers} ({percentage}%)
          </span>
        </div>
        <div className="w-full bg-[#1e2531] h-2 overflow-hidden border border-[#333d4d]/40">
          <div
            className="bg-gradient-to-r from-[#c9a227] to-[#6f9c86] h-full transition-all duration-700"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* 4. DANH SÁCH THÀNH VIÊN ĐÃ CHẤM */}
      <div className="border-t border-[#333d4d] pt-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="font-mono text-xs text-[#c9a227] uppercase tracking-wider">
            Danh sách đã tham gia ({votedList.length})
          </span>
          {votedList.length > 5 && (
            <div className="relative w-36 sm:w-44">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Lọc tên…"
                className="w-full pl-6 pr-2 py-1 text-xs bg-[#12161d] border border-[#333d4d] text-[#f1ede3] placeholder-[#6a7382] focus:outline-none focus:border-[#c9a227]"
              />
              <Search className="w-3 h-3 text-[#b9bdc7] absolute left-2 top-2" />
            </div>
          )}
        </div>

        <div className="max-h-[180px] overflow-y-auto pr-1">
          {filteredVoted.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 list-none m-0 p-0">
              {filteredVoted.map((v) => {
                const isCurrent = normalizeString(v.raw) === normalizeString(currentUser);
                return (
                  <li
                    key={v.raw}
                    className={`text-[13px] py-1.5 px-2.5 flex items-center justify-between gap-2 truncate transition-colors border ${
                      isCurrent
                        ? 'bg-[#c9a227]/15 text-[#e0bc4a] font-medium border-[#c9a227]/40 shadow-sm'
                        : 'text-[#b9bdc7] hover:text-[#f1ede3] bg-[#12161d]/50 border-transparent hover:border-[#333d4d]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[#6f9c86] text-xs font-mono">✓</span>
                      <span className="truncate">{v.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#c9a227]/80 shrink-0">
                      Tổ {v.groupNumber} {isCurrent && '(Bạn)'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-5 text-xs text-[#b9bdc7] italic">
              {votedList.length === 0
                ? 'Chưa có thành viên nào nộp điểm.'
                : 'Không tìm thấy tên nào phù hợp với bộ lọc.'}
            </div>
          )}
        </div>
      </div>

      {/* 5. FOOTER ACTIONS */}
      <div className="pt-2 border-t border-[#333d4d] flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {onOpenLive && (
          <button
            type="button"
            onClick={onOpenLive}
            className="w-full sm:flex-1 py-2.5 px-4 bg-[#c9a227]/20 hover:bg-[#c9a227]/30 text-[#e0bc4a] border border-[#c9a227]/60 text-xs font-mono transition-colors flex items-center justify-center gap-1.5 font-semibold shadow-[0_2px_10px_rgba(201,162,39,0.2)] cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            Mở Bảng Trực Tiếp (Live)
          </button>
        )}
        <button
          type="button"
          onClick={onResetUser}
          className="w-full sm:flex-1 py-2.5 px-4 border border-[#333d4d] hover:border-[#c9a227] text-xs text-[#b9bdc7] hover:text-[#f1ede3] bg-[#181d26] transition-colors flex items-center justify-center gap-1.5 font-medium shadow-sm hover:shadow-md cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Đăng xuất / Đổi thành viên
        </button>
      </div>
    </div>
  );
};
