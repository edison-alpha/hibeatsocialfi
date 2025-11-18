import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SequenceConnect } from '@0xsequence/connect';
import { sequenceConfig } from "@/lib/sequence-config";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SequenceProvider } from "@/contexts/SequenceContext";
import { SomniaDatastreamProvider } from "@/contexts/SomniaDatastreamContext";
import { RealtimeTransactionProvider } from "@/contexts/RealtimeTransactionContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { PlayCountProvider } from "@/contexts/PlayCountContext";
import AudioPlayer from "@/components/AudioPlayer";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import Beats from "./pages/Beats";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import MyPlaylist from "./pages/MyPlaylist";
import ArtistProfile from "./pages/ArtistProfile";
import DetailAlbum from "./pages/DetailAlbum";
import FeaturedArtists from "./pages/FeaturedArtists";
import LinerNotes from "./pages/LinerNotes";
import LinerNoteDetail from "./pages/LinerNoteDetail";
import CreatePage from "./pages/CreatePage";
import SongHistoryPage from "./pages/SongHistory";
import MyCollection from "./pages/MyCollection";
import UserProfile from "./pages/UserProfile";
import PostDetail from "./pages/PostDetail";
import Quests from "./pages/Quests";

import NotFound from "./pages/NotFound";
import ProfileCreation from "./components/ProfileCreation";
import ProfileCheckingSkeleton from "./components/ProfileCheckingSkeleton";
import SessionStatusIndicator from "./components/SessionStatusIndicator";

// Import integration test only when explicitly enabled
if (import.meta.env.DEV && import.meta.env.VITE_RUN_INTEGRATION_TESTS === 'true') {
  import("./utils/integrationTest");
}

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  
  const {
    isAuthenticated,
    userProfile,
    updateProfile,
    showProfileCreation,
    setShowProfileCreation,
    checkingProfile
  } = useAuth();

  const handleProfileSave = (profileData: any) => {
    updateProfile(profileData);
  };

  const handleProfileBack = () => {
    setShowProfileCreation(false);
  };

  return (
    <PlayCountProvider>
      <AudioProvider>
        {/* Loading skeleton when checking profile - Skip for test pages */}
        {checkingProfile && !window.location.pathname.startsWith('/test') && <ProfileCheckingSkeleton />}

      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/beats" element={<Beats />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/song-history" element={<SongHistoryPage />} />
        <Route path="/my-collection" element={<MyCollection />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/myplaylist" element={<MyPlaylist />} />
        <Route path="/featured-artists" element={<FeaturedArtists />} />
        <Route path="/liner-notes" element={<LinerNotes />} />
        <Route path="/liner-note-detail/:id" element={<LinerNoteDetail />} />
        <Route path="/artist/:artistId" element={<ArtistProfile />} />
        <Route path="/profile/:username" element={<UserProfile />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/album/:albumId" element={<DetailAlbum />} />
        <Route path="/quests" element={<Quests />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Authentication Modals - Only show when not on landing page */}
      {!isLandingPage && (
        <>
          <ProfileCreation
            isOpen={showProfileCreation && !userProfile && isAuthenticated}
            onClose={() => setShowProfileCreation(false)}
            onSave={handleProfileSave}
            onBack={handleProfileBack}
          />
        </>
      )}

      {/* Audio Player */}
      <AudioPlayer />
      
        {/* Session Status Indicator */}
        <SessionStatusIndicator />
      </AudioProvider>
    </PlayCountProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SequenceConnect config={sequenceConfig}>
      <RealtimeTransactionProvider>
        <SequenceProvider>
          <SomniaDatastreamProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </TooltipProvider>
            </AuthProvider>
          </SomniaDatastreamProvider>
        </SequenceProvider>
      </RealtimeTransactionProvider>
    </SequenceConnect>
  </QueryClientProvider>
);

export default App;
