import React, { useState, useEffect, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { VotingScreen } from './components/VotingScreen';
import { DoneScreen } from './components/DoneScreen';
import { AdminModal } from './components/AdminModal';
import { ImageLightbox } from './components/ImageLightbox';
import { Exhibit, ScreenState, VoteRecord } from './types';
import { storageService } from './services/storageService';
import { toTitleCase } from './data/initialData';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('login');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userGroup, setUserGroup] = useState<number>(1);
  const [alreadyVoted, setAlreadyVoted] = useState<boolean>(false);
  const [exhibits, setExhibits] = useState<Exhibit[]>(() => storageService.getExhibits());

  // Voting flow state: maps exhibitId -> score (1..10 or null)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [scores, setScores] = useState<{ [exhibitId: number]: number | null }>({
    1: null,
    2: null,
    3: null,
    4: null,
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modals
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [lightboxExhibit, setLightboxExhibit] = useState<Exhibit | null>(null);

  // Votable exhibits: only exhibits that DO NOT belong to the user's group
  const votableExhibits = useMemo(() => {
    return exhibits.filter((e) => e.groupNumber !== userGroup);
  }, [exhibits, userGroup]);

  // Listen for external updates (e.g. admin data cleared or votes changed)
  useEffect(() => {
    const handleStorageUpdate = () => {
      setExhibits(storageService.getExhibits());
      if (currentUser) {
        const vote = storageService.getUserVote(currentUser);
        if (vote && screen === 'vote') {
          setAlreadyVoted(true);
          setScreen('done');
        }
      }
    };

    window.addEventListener('gallery-vote-updated', handleStorageUpdate);

    // Initial sync from Google Sheets if configured
    if (storageService.getGasUrl()) {
      storageService.syncWithGoogleSheets();
    }

    // Periodic sync every 12 seconds
    const interval = setInterval(() => {
      if (storageService.getGasUrl() && !isSubmitting) {
        storageService.syncWithGoogleSheets();
      }
    }, 12000);

    return () => {
      window.removeEventListener('gallery-vote-updated', handleStorageUpdate);
      clearInterval(interval);
    };
  }, [currentUser, screen, isSubmitting]);

  // Handle member login selection
  const handleSelectMember = (memberRaw: string, groupNumber: number, hasVoted: boolean) => {
    setCurrentUser(memberRaw);
    setUserGroup(groupNumber);
    setAlreadyVoted(hasVoted);

    if (hasVoted) {
      setScreen('done');
    } else {
      setCurrentStepIndex(0);
      const initialScores: { [id: number]: number | null } = {
        1: null,
        2: null,
        3: null,
        4: null,
      };
      setScores(initialScores);
      setScreen('vote');
    }
  };

  // Handle score click for a specific exhibit
  const handleSelectScore = (exhibitId: number, score: number) => {
    setScores((prev) => ({
      ...prev,
      [exhibitId]: score,
    }));
  };

  const handlePrevExhibit = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleNextExhibit = () => {
    if (currentStepIndex < votableExhibits.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleSubmitVote = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);

    const votePayload: VoteRecord = {
      memberRaw: currentUser,
      displayName: toTitleCase(currentUser),
      groupNumber: userGroup,
      scores,
      timestamp: new Date().toISOString(),
    };

    // Save vote
    setTimeout(() => {
      const success = storageService.saveUserVote(votePayload);
      setIsSubmitting(false);

      if (success) {
        setAlreadyVoted(false);
        setScreen('done');
      } else {
        alert('Có lỗi khi lưu kết quả chấm điểm. Vui lòng thử lại.');
      }
    }, 400);
  };

  const handleResetUser = () => {
    setCurrentUser(null);
    setUserGroup(1);
    setAlreadyVoted(false);
    setScores({ 1: null, 2: null, 3: null, 4: null });
    setCurrentStepIndex(0);
    setScreen('login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 pb-16 selection:bg-[#c9a227] selection:text-[#1a1206]">
      {/* Center Container */}
      <div className="w-full max-w-xl flex flex-col items-center my-auto">
        <Header />

        {screen === 'login' || !currentUser ? (
          <LoginScreen onSelectMember={handleSelectMember} />
        ) : screen === 'vote' ? (
          <VotingScreen
            exhibits={exhibits}
            votableExhibits={votableExhibits}
            currentStepIndex={currentStepIndex}
            scores={scores}
            currentUser={currentUser}
            userGroup={userGroup}
            onSelectScore={handleSelectScore}
            onPrev={handlePrevExhibit}
            onNext={handleNextExhibit}
            onSubmit={handleSubmitVote}
            onOpenLightbox={(ex) => setLightboxExhibit(ex)}
            isSubmitting={isSubmitting}
          />
        ) : (
          <DoneScreen
            currentUser={currentUser}
            userGroup={userGroup}
            alreadyVoted={alreadyVoted}
            exhibits={exhibits}
            onResetUser={handleResetUser}
          />
        )}
      </div>

      {/* Admin Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsAdminOpen(true)}
        className="fixed bottom-5 right-5 w-10 h-10 rounded-full bg-[#1e2531] border border-[#333d4d] hover:border-[#c9a227] text-[#b9bdc7] hover:text-[#e0bc4a] shadow-lg flex items-center justify-center transition-all opacity-70 hover:opacity-100 hover:scale-105 z-30"
        title="Quản trị viên / Ban tổ chức"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Admin Panel Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        exhibits={exhibits}
        onUpdateExhibits={(newExhibits) => setExhibits(newExhibits)}
      />

      {/* Fullscreen Artwork Lightbox */}
      <ImageLightbox
        exhibit={lightboxExhibit}
        onClose={() => setLightboxExhibit(null)}
      />
    </div>
  );
}
