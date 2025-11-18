// src/pages/CreatePage.tsx
import React from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { GeneratePanel } from '../components/generate/GeneratePanel';
import { LibraryPanel } from '../components/library/LibraryPanel';
import { UnmintedMusicRecovery } from '../components/UnmintedMusicRecovery';
import { GeneratedMusicProvider } from '../contexts/GeneratedMusicContext';
import { GeneratedMusic } from '../types/music';
import Navbar from '@/components/Navbar';

interface CreatePageProps {
  onSongSelect?: (song: GeneratedMusic) => void;
}

const CreatePage: React.FC<CreatePageProps> = ({ onSongSelect }) => {
  return (
    <GeneratedMusicProvider>
      <div className="h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 pt-16 overflow-hidden">
          <div className="h-full p-4">
            <ResizablePanelGroup direction="horizontal" className="h-full border rounded-lg">
              {/* Generate Panel */}
              <ResizablePanel defaultSize={35} minSize={30}>
                <div className="h-full p-4 overflow-y-auto space-y-4">
                  <GeneratePanel />
                  <UnmintedMusicRecovery />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Library Panel */}
              <ResizablePanel defaultSize={65} minSize={40}>
                <div className="h-full p-4 overflow-y-auto">
                  <LibraryPanel onSongSelect={onSongSelect} />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </div>
    </GeneratedMusicProvider>
  );
};

export default CreatePage;