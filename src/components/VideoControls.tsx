import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';
import { useVideo } from '../contexts/VideoContext';
import { useAuth } from '../contexts/AuthContext';
import { VideoOff, Flag, SkipForward, Filter, Search, X } from 'lucide-react';
import ReportModal from './modals/ReportModal';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: { country?: string; gender?: string }) => void;
  currentFilters: { country?: string; gender?: string };
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [country, setCountry] = useState<string>(currentFilters.country || '');
  const [gender, setGender] = useState<string>(currentFilters.gender || '');

  const handleApply = () => {
    onApply({
      country: country || undefined,
      gender: gender || undefined
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-dark-300 rounded-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-dark-200">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Filter size={20} className="text-primary-500" />
            Match Filters
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white"
            >
              <option value="">Any Country</option>
              <option value="TR">Turkey</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white"
            >
              <option value="">Any Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-dark-100 text-white hover:bg-dark-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const VideoControls: React.FC = () => {
  const { chatState, findMatch, endMatch } = useSocket();
  const { 
    isVideoOff,
    toggleVideo,
    hasPermission,
  } = useVideo();
  const { coins, spendCoins } = useAuth();
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    country?: string;
    gender?: string;
  }>({});

  const handleMatch = async () => {
    if (coins < 1) {
      alert('Not enough coins! Please purchase more.');
      return;
    }

    try {
      const success = await spendCoins(1, 'Video chat match');
      if (success) {
        findMatch(activeFilters);
      }
    } catch (error) {
      console.error('Error starting match:', error);
    }
  };

  const renderControls = () => {
    if (!hasPermission) return null;

    const commonButtonClasses = "rounded-full p-4 backdrop-blur-sm transition-all duration-300";

    switch (chatState) {
      case 'idle':
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilterModal(true)}
              className={`${commonButtonClasses} bg-white/5 hover:bg-white/10 ${
                Object.keys(activeFilters).length > 0 ? 'text-primary-500' : 'text-white'
              }`}
              title="Match Filters"
            >
              <Filter size={24} />
            </button>
            
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleMatch}
              disabled={coins < 1}
              className="btn-secondary flex items-center gap-2"
            >
              <Search size={20} />
              Start Matching
            </motion.button>
          </div>
        );
      
      case 'requesting':
      case 'connecting':
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilterModal(true)}
              className={`${commonButtonClasses} bg-white/5 hover:bg-white/10`}
              title="Change Filters"
            >
              <Filter size={24} />
            </button>
            
            <button
              onClick={endMatch}
              className="btn-outline flex items-center gap-2"
            >
              Cancel Search
            </button>
          </div>
        );
      
      case 'matched':
        return (
          <>
            <button
              onClick={toggleVideo}
              className={`${commonButtonClasses} ${
                isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <VideoOff size={24} />
            </button>
            
            <button
              onClick={() => setShowReportModal(true)}
              className={`${commonButtonClasses} bg-white/5 hover:bg-white/10 text-yellow-500`}
            >
              <Flag size={24} />
            </button>
            
            <button
              onClick={endMatch}
              className="btn-primary flex items-center gap-2"
            >
              <SkipForward size={20} />
              Next
            </button>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
      >
        {renderControls()}
      </motion.div>
      
      <ReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
      />

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={setActiveFilters}
        currentFilters={activeFilters}
      />
    </>
  );
};

export default VideoControls;