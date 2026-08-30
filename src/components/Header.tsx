import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="flex flex-col items-center gap-1.5 mb-7 text-center select-none">
      <span className="font-mono tracking-[0.24em] text-[11px] text-[#c9a227] uppercase font-semibold">
        Sự kiện nội bộ
      </span>
      <h1 className="font-serif italic font-semibold text-[clamp(26px,5vw,38px)] text-[#f1ede3] m-0 tracking-tight">
        Phòng Trưng Bày
      </h1>
      <p className="text-[#b9bdc7] text-sm mt-0.5 max-w-md">
        Bình chọn &amp; chấm điểm 4 tác phẩm
      </p>
    </header>
  );
};
