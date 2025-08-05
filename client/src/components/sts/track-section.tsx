import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TrackSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  noExtraPadding?: boolean;
}

export default function TrackSection({ 
  title, 
  children, 
  defaultExpanded = true,
  icon,
  noExtraPadding = false
}: TrackSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="collapsible-section">

      <div 
        className="collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {icon && <div className="text-[var(--rian-accent)]">{icon}</div>}
          <h3 className="font-medium text-white">{title}</h3>
        </div>
        <div className="text-gray-400">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </div>
      <div className={`collapsible-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className={`p-4 ${noExtraPadding ? '' : 'pb-24'} overflow-y-auto`} style={{ maxHeight: '75vh' }}>
          {children}
        </div>
      </div>
    </div>
  );
}