import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Play, Square, Save, Upload, Download, Trash2, RefreshCw, Music, Mic, Check } from "lucide-react";

interface MenuBarProps {
  onPlayAll: () => void;
  onStopAll: () => void;
  isPlaying: boolean;
  onFileUpload: (file: File, trackType: string, trackName: string) => void;
  viewSettings: {
    showVideo: boolean;
    showAudio: boolean;
    showME: boolean;
  };
  onViewSettingsChange: (settings: any) => void;
}

export default function MenuBar({
  onPlayAll,
  onStopAll,
  isPlaying,
  onFileUpload,
  viewSettings,
  onViewSettingsChange
}: MenuBarProps) {
  const [autoSave, setAutoSave] = useState(true);

  const handleFileInput = (trackType: string, trackName: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onFileUpload(file, trackType, trackName);
      }
    };
    input.click();
  };

  return (
    <div className="rian-surface border-b rian-border">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[var(--rian-accent)] rounded flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-white rounded-sm"></div>
            </div>
            <span className="font-semibold text-lg">RIAN STS Editor</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* File Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-3 py-1 rounded hover:rian-elevated">
                  File
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rian-surface rian-border min-w-48">
                <DropdownMenuCheckboxItem 
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                  className="hover:rian-elevated"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Auto Save
                </DropdownMenuCheckboxItem>
                <DropdownMenuItem className="hover:rian-elevated">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:rian-elevated">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuSeparator className="rian-border" />
                <DropdownMenuItem 
                  className="hover:rian-elevated"
                  onClick={() => handleFileInput('speaker', 'Audio Files')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Audio Files
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:rian-elevated"
                  onClick={() => handleFileInput('me', 'M&E File')}
                >
                  <Music className="w-4 h-4 mr-2" />
                  Upload M&E File
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:rian-elevated"
                  onClick={() => handleFileInput('source', 'Source Audio')}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Upload Source Audio File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-3 py-1 rounded hover:rian-elevated">
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rian-surface rian-border min-w-48">
                <DropdownMenuCheckboxItem
                  checked={viewSettings.showVideo}
                  onCheckedChange={(checked) => 
                    onViewSettingsChange({ ...viewSettings, showVideo: checked })
                  }
                  className="hover:rian-elevated"
                >
                  {viewSettings.showVideo && <Check className="w-4 h-4 mr-2 text-[var(--rian-success)]" />}
                  {!viewSettings.showVideo && <div className="w-4 h-4 mr-2" />}
                  Show Video File
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={viewSettings.showAudio}
                  onCheckedChange={(checked) => 
                    onViewSettingsChange({ ...viewSettings, showAudio: checked })
                  }
                  className="hover:rian-elevated"
                >
                  {viewSettings.showAudio && <Check className="w-4 h-4 mr-2 text-[var(--rian-success)]" />}
                  {!viewSettings.showAudio && <div className="w-4 h-4 mr-2" />}
                  Show Audio Files
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={viewSettings.showME}
                  onCheckedChange={(checked) => 
                    onViewSettingsChange({ ...viewSettings, showME: checked })
                  }
                  className="hover:rian-elevated"
                >
                  {viewSettings.showME && <Check className="w-4 h-4 mr-2 text-[var(--rian-success)]" />}
                  {!viewSettings.showME && <div className="w-4 h-4 mr-2" />}
                  Show M&E File
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tools Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-3 py-1 rounded hover:rian-elevated">
                  Tools
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rian-surface rian-border min-w-48">
                <DropdownMenuItem className="hover:rian-elevated">
                  <div className="w-4 h-4 mr-2 text-[var(--rian-accent)]">🤖</div>
                  Generate Speech to Speech
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:rian-elevated">
                  <Download className="w-4 h-4 mr-2" />
                  Download Files
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:rian-elevated text-[var(--rian-danger)]">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Files
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-3">
          <Button
            onClick={onPlayAll}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              isPlaying 
                ? 'bg-[var(--rian-warning)] hover:bg-yellow-600' 
                : 'bg-[var(--rian-success)] hover:bg-green-600'
            }`}
          >
            {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause All' : 'Play All'}</span>
          </Button>
          <Button
            onClick={onStopAll}
            className="bg-[var(--rian-danger)] hover:bg-red-600 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Square className="w-4 h-4" />
            <span>Stop All</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
