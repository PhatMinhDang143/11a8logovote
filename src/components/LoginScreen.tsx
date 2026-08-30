import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, UserCheck, AlertCircle, CheckCircle2, KeyRound, Eye, EyeOff, X } from 'lucide-react';
import {
  RAW_MEMBERS,
  GROUPS,
  normalizeString,
  toTitleCase,
  validateStudentPin,
} from '../data/initialData';
import { storageService } from '../services/storageService';

interface LoginScreenProps {
  onSelectMember: (memberRaw: string, groupNumber: number, alreadyVoted: boolean) => void;
}

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSelectMember }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }
    const cleanQuery = removeVietnameseTones(searchTerm.trim().toLowerCase());
    return RAW_MEMBERS.filter((name) => {
      const cleanName = removeVietnameseTones(name.toLowerCase());
      return cleanName.includes(cleanQuery) || name.toLowerCase().includes(searchTerm.toLowerCase());
    }).slice(0, 8);
  }, [searchTerm]);

  const handleSelectMember = (memberName: string) => {
    setSelectedMember(memberName);
    setSearchTerm(toTitleCase(memberName));
    setIsDropdownOpen(false);
    setErrorMessage('');
    setPinInput('');

    // If member previously voted, pre-select their group
    const existing = storageService.getUserVote(memberName);
    if (existing && existing.groupNumber) {
      setSelectedGroup(existing.groupNumber);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedMember(null);
    setIsDropdownOpen(false);
  };

  const handleEnter = () => {
    setErrorMessage('');
    const targetName = selectedMember || searchTerm.trim();
    if (!targetName) {
      setErrorMessage('Vui lòng nhập hoặc chọn tên của bạn từ danh sách.');
      return;
    }

    const matched = RAW_MEMBERS.find(
      (m) =>
        normalizeString(m) === normalizeString(targetName) ||
        removeVietnameseTones(m.toLowerCase()) === removeVietnameseTones(targetName.toLowerCase())
    );

    if (!matched) {
      setErrorMessage('Không tìm thấy tên này trong danh sách 45 thành viên. Vui lòng chọn từ gợi ý.');
      return;
    }

    // Check PIN requirement
    const cleanPin = pinInput.trim().replace(/\D/g, '');
    if (!cleanPin) {
      setErrorMessage('Vui lòng nhập mật khẩu (4 số ngày/tháng sinh của bạn).');
      return;
    }

    if (cleanPin.length !== 4) {
      setErrorMessage('Mật khẩu phải gồm 4 chữ số Ngày và Tháng sinh (Ví dụ: sinh ngày 5/4 thì nhập 0504).');
      return;
    }

    const isPinValid = validateStudentPin(matched, cleanPin);
    if (!isPinValid) {
      setErrorMessage('Mật khẩu không chính xác. Vui lòng nhập đúng ngày/tháng sinh của bạn (4 số, ví dụ 0504).');
      return;
    }

    if (!selectedGroup) {
      setErrorMessage('Vui lòng chọn Tổ bạn đang trực thuộc.');
      return;
    }

    const existingVote = storageService.getUserVote(matched);
    const finalGroup = existingVote?.groupNumber || selectedGroup;
    onSelectMember(matched, finalGroup, !!existingVote);
  };

  return (
    <div className="w-full max-w-[560px] bg-gradient-to-b from-[#1e2531] to-[#181d26] border border-[#333d4d] rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] transition-all">
      {/* 1. Member selection */}
      <label className="text-[12px] uppercase tracking-[0.14em] text-[#b9bdc7] mb-2 block font-mono font-medium">
        1. Bạn là thành viên nào?
      </label>

      <div className="relative mb-4" ref={dropdownRef}>
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedMember(null);
              setIsDropdownOpen(true);
              setErrorMessage('');
            }}
            onFocus={() => {
              if (searchTerm.trim().length > 0) {
                setIsDropdownOpen(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsDropdownOpen(false);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredMembers.length === 1 && !selectedMember) {
                  handleSelectMember(filteredMembers[0]);
                } else {
                  handleEnter();
                }
              }
            }}
            placeholder="Gõ tên của bạn để tìm nhanh…"
            className="w-full pl-11 pr-10 py-3.5 text-base bg-[#12161d] border border-[#333d4d] rounded-xl text-[#f1ede3] placeholder-[#6a7382] focus:outline-none focus:border-[#e0bc4a] focus:ring-1 focus:ring-[#e0bc4a] transition-all font-sans"
            autoComplete="off"
          />
          <Search className="w-5 h-5 text-[#b9bdc7] absolute left-3.5 pointer-events-none" />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 p-1 rounded-md text-[#b9bdc7] hover:text-[#f1ede3] hover:bg-[#262f3d] transition-colors"
              title="Xóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isDropdownOpen && searchTerm.trim().length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-[#181d26] border border-[#333d4d] rounded-xl shadow-2xl divide-y divide-[#262f3d]/60">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((name) => {
                const voted = storageService.getUserVote(name);
                const isSelected = selectedMember === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelectMember(name)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-sm transition-colors hover:bg-[#262f3d] ${
                      isSelected ? 'bg-[#262f3d] text-[#e0bc4a] font-medium' : 'text-[#f1ede3]'
                    }`}
                  >
                    <span className="truncate">{toTitleCase(name)}</span>
                    {voted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#6f9c86] bg-[#6f9c86]/10 px-2 py-0.5 rounded-full border border-[#6f9c86]/30 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Đã chấm (Tổ {voted.groupNumber})
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#b9bdc7] font-mono opacity-60">
                        Chưa chấm
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-[#b9bdc7] italic text-center">
                Không tìm thấy tên &quot;{searchTerm}&quot; trong danh sách
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Birthday PIN Security input */}
      <div className="mb-4">
        <label className="text-[12px] uppercase tracking-[0.14em] text-[#b9bdc7] mb-2 flex items-center justify-between font-mono font-medium">
          <span className="flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[#e0bc4a]" /> 2. Mật khẩu (Ngày &amp; Tháng sinh - 4 số)
          </span>
          <span className="text-[11px] text-[#c9a227] normal-case font-normal">
            VD: Sinh ngày 05/04 nhập 0504
          </span>
        </label>

        <div className="relative flex items-center">
          <input
            type={showPin ? 'text' : 'password'}
            maxLength={4}
            value={pinInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPinInput(val);
              setErrorMessage('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleEnter();
              }
            }}
            placeholder="Nhập 4 số ngày/tháng sinh (VD: 0504)..."
            className="w-full pl-4 pr-12 py-3 text-sm font-mono tracking-widest bg-[#12161d] border border-[#333d4d] rounded-xl text-[#f1ede3] placeholder-[#6a7382] focus:outline-none focus:border-[#e0bc4a] focus:ring-1 focus:ring-[#e0bc4a] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="absolute right-3 p-1.5 text-[#b9bdc7] hover:text-[#f1ede3] transition-colors"
            title={showPin ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. Group selection */}
      <label className="text-[12px] uppercase tracking-[0.14em] text-[#b9bdc7] mb-2 block font-mono font-medium">
        3. Bạn trực thuộc Tổ nào?
      </label>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {GROUPS.map((g) => {
          const isSelected = selectedGroup === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setSelectedGroup(g.id);
                setErrorMessage('');
              }}
              className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                isSelected
                  ? 'bg-gradient-to-b from-[#e0bc4a] to-[#c9a227] text-[#1a1206] border-[#e0bc4a] shadow-[0_4px_12px_rgba(201,162,39,0.35)] font-bold scale-[1.02]'
                  : 'bg-[#12161d] text-[#f1ede3] border-[#333d4d] hover:border-[#c9a227] hover:bg-[#181d26]'
              }`}
            >
              <span>{g.name}</span>
            </button>
          );
        })}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-[#e2725b] text-xs sm:text-sm mt-2.5 mb-2 font-medium animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {selectedMember && (
        <div className="mt-2 p-3 rounded-xl bg-[#12161d]/80 border border-[#333d4d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#c9a227]/20 border border-[#c9a227] text-[#e0bc4a] flex items-center justify-center font-serif italic text-xs font-semibold">
              {toTitleCase(selectedMember).charAt(0)}
            </div>
            <div>
              <p className="text-xs text-[#b9bdc7]">Thành viên đã chọn:</p>
              <p className="text-sm font-medium text-[#f1ede3]">
                {toTitleCase(selectedMember)} • <span className="text-[#e0bc4a] font-mono">Tổ {selectedGroup}</span>
              </p>
            </div>
          </div>
          {storageService.getUserVote(selectedMember) && (
            <span className="text-xs text-[#6f9c86] bg-[#6f9c86]/15 px-2.5 py-1 rounded-full border border-[#6f9c86]/30 font-mono">
              Đã ghi nhận
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleEnter}
        className="w-full mt-4 py-3.5 px-5 rounded-xl font-semibold text-[15px] bg-gradient-to-b from-[#e0bc4a] to-[#c9a227] text-[#1a1206] shadow-[0_4px_14px_rgba(201,162,39,0.35)] hover:shadow-[0_6px_22px_rgba(201,162,39,0.55)] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
      >
        <UserCheck className="w-4 h-4" />
        Vào chấm điểm (Tổ {selectedGroup})
      </button>
    </div>
  );
};
