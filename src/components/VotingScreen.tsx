import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Maximize2 } from 'lucide-react';
import { Exhibit } from '../types';
import { toTitleCase, formatImageUrl } from '../data/initialData';

interface VotingScreenProps {
  exhibits: Exhibit[];
  votableExhibits: Exhibit[];
  currentStepIndex: number;
  scores: { [exhibitId: number]: number | null };
  currentUser: string;
  userGroup: number;
  onSelectScore: (exhibitId: number, score: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onOpenLightbox: (exhibit: Exhibit) => void;
  isSubmitting: boolean;
}

export const VotingScreen: React.FC<VotingScreenProps> = ({
  exhibits,
  votableExhibits,
  currentStepIndex,
  scores,
  currentUser,
  userGroup,
  onSelectScore,
  onPrev,
  onNext,
  onSubmit,
  onOpenLightbox,
  isSubmitting,
}) => {
  const currentExhibit = votableExhibits[currentStepIndex];
  const currentScore = currentExhibit ? scores[currentExhibit.id] ?? null : null;
  const isLast = currentStepIndex === votableExhibits.length - 1;

  // Check if all votable exhibits have scores
  const allVotableFilled = votableExhibits.every(
    (e) => typeof scores[e.id] === 'number'
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key;
      if (key >= '1' && key <= '9' && currentExhibit) {
        onSelectScore(currentExhibit.id, parseInt(key, 10));
      } else if (key === '0' && currentExhibit) {
        onSelectScore(currentExhibit.id, 10);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentScore !== null) {
          if (isLast && allVotableFilled) {
            onSubmit();
          } else if (!isLast) {
            onNext();
          }
        }
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        onPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentStepIndex,
    currentExhibit,
    currentScore,
    isLast,
    allVotableFilled,
    onNext,
    onPrev,
    onSelectScore,
    onSubmit,
  ]);

  if (!currentExhibit) return null;

  const displayImageUrl = formatImageUrl(currentExhibit.url);

  return (
    <div className="w-full max-w-[560px] bg-gradient-to-b from-[#1e2531] to-[#181d26] border border-[#333d4d] rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] transition-all">
      {/* Top Banner: User Group Context */}
      <div className="mb-5 bg-[#12161d] border border-[#333d4d] rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e0bc4a] animate-pulse"></span>
          <span className="text-[#b9bdc7]">
            Thành viên: <strong className="text-[#f1ede3] font-medium">{toTitleCase(currentUser)}</strong>
          </span>
        </div>
        <span className="font-mono text-[#e0bc4a] bg-[#c9a227]/15 border border-[#c9a227]/40 px-2.5 py-0.5 rounded-full font-semibold">
          Tổ {userGroup}
        </span>
      </div>

      {/* Progress Tabs for all 4 Exhibits */}
      <div className="flex gap-2 justify-center mb-6">
        {exhibits.map((ex) => {
          const isOwnGroup = ex.groupNumber === userGroup;
          const isCurrentActive = currentExhibit.id === ex.id;
          const scoreGiven = scores[ex.id];
          const hasScore = typeof scoreGiven === 'number';

          if (isOwnGroup) {
            return (
              <div
                key={ex.id}
                className="h-[34px] px-3 rounded-full flex items-center justify-center font-mono text-xs border border-[#333d4d]/40 text-[#b9bdc7]/40 bg-[#12161d]"
              >
                Tổ {ex.groupNumber}
              </div>
            );
          }

          const stepIdx = votableExhibits.findIndex((ve) => ve.id === ex.id);

          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => {
                const diff = stepIdx - currentStepIndex;
                if (diff > 0) {
                  for (let i = 0; i < diff; i++) onNext();
                } else if (diff < 0) {
                  for (let i = 0; i < Math.abs(diff); i++) onPrev();
                }
              }}
              className={`h-[34px] px-3 rounded-full flex items-center justify-center font-mono text-xs border transition-all cursor-pointer ${
                isCurrentActive
                  ? 'border-[#c9a227] text-[#e0bc4a] bg-[#c9a227]/15 ring-2 ring-[#c9a227]/30 scale-105 font-semibold'
                  : hasScore
                  ? 'border-[#6f9c86] text-[#6f9c86] bg-[#6f9c86]/10 font-medium'
                  : 'border-[#333d4d] text-[#b9bdc7] bg-[#181d26] hover:border-[#c9a227]'
              }`}
            >
              <span>Tổ {ex.groupNumber}</span>
              {hasScore && !isCurrentActive && (
                <span className="ml-1 text-[10px] text-[#6f9c86] font-bold">({scoreGiven}đ)</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Plaque Header */}
      <div className="flex items-center gap-2.5 justify-center mb-1.5">
        <span className="h-[1px] w-6 bg-[#c9a227] opacity-60"></span>
        <span className="font-mono tracking-[0.2em] text-[11px] text-[#c9a227] uppercase font-semibold">
          CHẤM ĐIỂM {currentStepIndex + 1} / {votableExhibits.length}
        </span>
        <span className="h-[1px] w-6 bg-[#c9a227] opacity-60"></span>
      </div>

      {/* Exhibit Title */}
      <h2 className="font-serif italic font-medium text-center text-xl sm:text-2xl m-0 mb-4 text-[#f1ede3]">
        Tác phẩm Tổ {currentExhibit.groupNumber}
      </h2>

      {/* Frame & Image */}
      <div className="relative rounded-xl overflow-hidden border border-[#333d4d] bg-[#0c0f14] aspect-[4/3] shadow-[inset_0_0_0_6px_#0c0f14,inset_0_0_0_7px_#3a2f14] group">
        <img
          src={displayImageUrl}
          alt={`Tác phẩm Tổ ${currentExhibit.groupNumber}`}
          className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
        />
        <button
          type="button"
          onClick={() => onOpenLightbox(currentExhibit)}
          className="absolute bottom-3 right-3 bg-[#12161d]/85 hover:bg-[#1e2531] border border-[#333d4d] text-[#f1ede3] p-2 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-sm opacity-90 hover:opacity-100 transition-all shadow-md"
          title="Xem ảnh cỡ lớn"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#e0bc4a]" />
          <span className="font-mono text-[11px]">Phóng to</span>
        </button>
      </div>

      {/* Score Selection */}
      <div className="text-center font-mono text-[11px] tracking-[0.16em] uppercase text-[#b9bdc7] mt-6 mb-3 flex items-center justify-center gap-1.5">
        <span>Chọn điểm cho tác phẩm Tổ {currentExhibit.groupNumber} (1 → 10)</span>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const isSelected = currentScore === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelectScore(currentExhibit.id, n)}
              className={`aspect-square rounded-xl border font-mono text-lg font-medium flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-gradient-to-b from-[#e0bc4a] to-[#c9a227] text-[#1a1206] border-[#e0bc4a] shadow-[0_6px_18px_-4px_rgba(201,162,39,0.7)] -translate-y-0.5 scale-105 font-bold'
                  : 'bg-[#181d26] text-[#f1ede3] border-[#333d4d] hover:border-[#c9a227] hover:bg-[#262f3d]'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-2.5 mt-6">
        {currentStepIndex > 0 && (
          <button
            type="button"
            onClick={onPrev}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-[#333d4d] bg-transparent text-[#b9bdc7] hover:border-[#c9a227] hover:text-[#f1ede3] font-semibold text-sm transition-all flex items-center justify-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại
          </button>
        )}

        <button
          type="button"
          onClick={isLast ? onSubmit : onNext}
          disabled={currentScore === null || isSubmitting}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 ${
            currentScore !== null && !isSubmitting
              ? 'bg-gradient-to-b from-[#e0bc4a] to-[#c9a227] text-[#1a1206] shadow-[0_4px_16px_rgba(201,162,39,0.4)] hover:shadow-[0_6px_22px_rgba(201,162,39,0.6)] active:scale-[0.99]'
              : 'bg-[#262f3d]/60 text-[#b9bdc7]/40 border border-[#333d4d]/40 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-[#1a1206] border-t-transparent rounded-full animate-spin"></span>
              Đang lưu kết quả…
            </span>
          ) : isLast ? (
            <span className="flex items-center gap-1.5">
              Hoàn tất &amp; Gửi điểm <Check className="w-4 h-4 text-[#1a1206]" />
            </span>
          ) : (
            <span className="flex items-center gap-1">
              Tác phẩm kế tiếp <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </button>
      </div>

      {/* Helper Footer */}
      <div className="flex justify-between items-center text-[11px] text-[#b9bdc7]/70 font-mono mt-4 pt-3 border-t border-[#333d4d]/40">
        <span>Tổ của bạn: <strong className="text-[#e0bc4a] font-sans">Tổ {userGroup}</strong></span>
        <span>Phím tắt: 1–9, 0</span>
      </div>
    </div>
  );
};
