import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, X } from "lucide-react";

interface EditSpeakerModalProps {
  visible: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export default function EditSpeakerModal({
  visible,
  currentName,
  onClose,
  onSave
}: EditSpeakerModalProps) {
  const [speakerName, setSpeakerName] = useState(currentName);

  useEffect(() => {
    setSpeakerName(currentName);
  }, [currentName]);

  const handleSave = () => {
    if (speakerName.trim()) {
      onSave(speakerName.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!visible) return null;

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="rian-surface border rian-border w-96">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Edit Speaker Name</DialogTitle>
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
            <label className="block text-sm font-medium mb-2">Speaker Name</label>
            <Input
              type="text"
              value={speakerName}
              onChange={(e) => setSpeakerName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full rian-elevated border rian-border rounded-lg px-3 py-2 text-white focus:border-[var(--rian-accent)] focus:outline-none"
              placeholder="Enter speaker name..."
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="px-4 py-2 rian-elevated hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!speakerName.trim()}
              className="px-4 py-2 bg-[var(--rian-success)] hover:bg-green-600 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
