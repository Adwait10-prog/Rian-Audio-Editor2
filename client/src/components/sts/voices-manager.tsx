import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, Plus, Trash2, User, Mic } from "lucide-react";

interface Voice {
  voice_id: string;
  name: string;
  description?: string;
  category: string;
  labels: Record<string, string>;
  preview_url?: string;
  available_for_tiers: string[];
  settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

interface VoicesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onVoicesSelected: (voices: Voice[]) => void;
  selectedVoiceIds?: string[];
}

export default function VoicesManager({ 
  isOpen, 
  onClose, 
  onVoicesSelected,
  selectedVoiceIds = [] 
}: VoicesManagerProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set(selectedVoiceIds));
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const fetchVoices = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching voices from: /api/elevenlabs/voices');
      
      // First try the backend endpoint
      let response = await fetch('/api/elevenlabs/voices');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        console.log('Backend failed, trying direct ElevenLabs API...');
        
        // Fallback: Direct API call from frontend
        response = await fetch('https://api.elevenlabs.io/v2/voices', {
          headers: {
            'xi-api-key': 'sk_a6d6b1da1f11871027eafac43784fb5728ac04414e1bb800',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Direct API also failed: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('Voices data:', data);
      setVoices(data.voices || []);
    } catch (err) {
      console.error('Fetch voices error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVoices();
      setTempSelectedIds(new Set(selectedVoiceIds));
    }
  }, [isOpen, selectedVoiceIds]);

  const handleToggleVoice = (voiceId: string) => {
    const newSelected = new Set(tempSelectedIds);
    if (newSelected.has(voiceId)) {
      newSelected.delete(voiceId);
    } else {
      newSelected.add(voiceId);
    }
    setTempSelectedIds(newSelected);
  };

  const handleApply = () => {
    const selectedVoices = voices.filter(voice => tempSelectedIds.has(voice.voice_id));
    onVoicesSelected(selectedVoices);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedIds(new Set(selectedVoiceIds));
    onClose();
  };

  const filteredVoices = voices.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         voice.description?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = categoryFilter === "all" || voice.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(voices.map(voice => voice.category))).sort();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="text-xl font-semibold text-white">Manage Voices</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-600">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search voices..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading voices...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-red-500 mb-4">⚠️</div>
                <p className="text-red-400 mb-4">{error}</p>
                <Button onClick={fetchVoices} className="bg-blue-600 hover:bg-blue-500">
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVoices.map((voice) => (
                  <div
                    key={voice.voice_id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      tempSelectedIds.has(voice.voice_id)
                        ? 'border-blue-500 bg-blue-500 bg-opacity-20'
                        : 'border-gray-600 bg-gray-700 hover:bg-gray-650'
                    }`}
                    onClick={() => handleToggleVoice(voice.voice_id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Mic className="w-4 h-4 text-blue-400" />
                        <h3 className="font-medium text-white truncate">{voice.name}</h3>
                      </div>
                      {tempSelectedIds.has(voice.voice_id) && (
                        <Check className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-300">
                      <p className="capitalize">Category: {voice.category}</p>
                      {voice.description && (
                        <p className="line-clamp-2">{voice.description}</p>
                      )}
                      {voice.labels && Object.keys(voice.labels).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(voice.labels).map(([key, value]) => (
                            <span
                              key={key}
                              className="px-2 py-1 bg-gray-600 rounded text-xs"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredVoices.length === 0 && !loading && (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No voices found matching your criteria</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-600">
          <div className="text-sm text-gray-400">
            {tempSelectedIds.size} voice{tempSelectedIds.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white"
            >
              Apply Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}