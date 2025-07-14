import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Download, Trash2 } from "lucide-react";

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onGenerateSTS: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export default function ContextMenu({
  visible,
  x,
  y,
  onClose,
  onGenerateSTS,
  onDownload,
  onDelete
}: ContextMenuProps) {
  useEffect(() => {
    const handleClickOutside = () => {
      onClose();
    };

    if (visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 rian-surface border rian-border rounded-lg shadow-lg min-w-48"
      style={{ left: x, top: y }}
    >
      <div className="py-2">
        <Button
          variant="ghost"
          className="w-full justify-start px-4 py-2 hover:rian-elevated text-left"
          onClick={() => {
            onGenerateSTS();
            onClose();
          }}
        >
          <Bot className="w-4 h-4 mr-2 text-[var(--rian-accent)]" />
          Generate STS for specific time
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start px-4 py-2 hover:rian-elevated text-left"
          onClick={() => {
            onDownload();
            onClose();
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Individual Audio
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start px-4 py-2 hover:rian-elevated text-left text-[var(--rian-danger)]"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Audio File
        </Button>
      </div>
    </div>
  );
}
