import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Exhibit } from '../types';
import { formatImageUrl } from '../data/initialData';

interface ImageLightboxProps {
  exhibit: Exhibit | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ exhibit, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!exhibit) return null;

  const displayImageUrl = formatImageUrl(exhibit.url);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0a0c10]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-[#181d26] border border-[#333d4d] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#333d4d] bg-[#1e2531]/80">
          <div>
            <span className="font-mono text-xs text-[#c9a227] uppercase tracking-wider block font-semibold">
              Tổ {exhibit.groupNumber}
            </span>
            <h3 className="font-serif italic text-lg text-[#f1ede3] font-medium m-0">
              Tác phẩm Tổ {exhibit.groupNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#333d4d] text-[#b9bdc7] hover:text-[#f1ede3] transition-colors"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 min-h-[300px] max-h-[75vh] bg-[#0c0f14] flex items-center justify-center p-3 overflow-hidden">
          <img
            src={displayImageUrl}
            alt={`Tác phẩm Tổ ${exhibit.groupNumber}`}
            className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-inner"
          />
        </div>
      </div>
    </div>
  );
};
