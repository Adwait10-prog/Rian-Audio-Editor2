import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Clock, X } from "lucide-react";
import type { VoiceClone } from "@shared/schema";

interface STSModalProps {
  visible: boolean;
  voiceClones: VoiceClone[];
  onClose: () => void;
  onGenerate: (voiceCloneId: number) => void;
  isLoading?: boolean;
}

export default function STSModal({
  visible,
  voiceClones,
  onClose,
  onGenerate,
  isLoading = false
}: STSModalProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>("");

  const handleGenerate = () => {
    if (selectedVoice) {
      onGenerate(parseInt(selectedVoice));
    }
  };

  if (!visible) return null;

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="rian-surface border rian-border w-96">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Generate Speech to Speech</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Select Voice Clone</label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="w-full rian-elevated border rian-border rounded-lg px-3 py-2 text-white">
                <SelectValue placeholder="Choose a voice clone..." />
              </SelectTrigger>
              <SelectContent className="rian-surface rian-border">
                {voiceClones.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id.toString()}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Estimated processing time: 2-3 minutes</span>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rian-elevated hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!selectedVoice || isLoading}
              className="px-4 py-2 bg-[var(--rian-accent)] hover:bg-blue-600 rounded-lg transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Generate STS
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
