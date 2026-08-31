import React from 'react';
import { Radio } from 'lucide-react';

interface HeaderProps {
  onOpenLive?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenLive }) => {
  return (
    <header className="flex flex-col items-center gap-1.5 mb-7 text-center select-none w-full relative">
      {onOpenLive && (
        <div className="mb-2">
          <button
            type="button"
            onClick={onOpenLive}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#181d26] hover:bg-[#202733] border border-[#c9a227]/50 hover:border-[#e0bc4a] text-[#e0bc4a] text-xs font-mono transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e2725b] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e2725b]"></span>
            </span>
            <span className="font-semibold uppercase tracking-wider">Xem Bảng Trực Tiếp Phát Điểm</span>
            <Radio className="w-3.5 h-3.5 text-[#e0bc4a] group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      <span className="font-mono tracking-[0.24em] text-[11px] text-[#c9a227] uppercase font-semibold">
        Sự kiện nội bộ
      </span>
      <h1 className="font-serif italic font-semibold text-[clamp(26px,5vw,38px)] text-[#f1ede3] m-0 tracking-tight">
        Phòng Trưng Bày
      </h1>
      <p className="text-[#b9bdc7] text-sm mt-0.5 max-w-md font-medium">
        Bình chọn &amp; chấm điểm 4 tác phẩm của lớp 11A8
      </p>
    </header>
  );
};

