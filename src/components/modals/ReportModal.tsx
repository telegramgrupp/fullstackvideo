import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../contexts/SocketContext';
import { supabase } from '../../lib/supabaseClient';
import { Flag, X, Loader } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
  const { peerData } = useSocket();
  const [reason, setReason] = useState<string>('inappropriate_content');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const reportReasons = [
    { id: 'inappropriate_content', label: 'Inappropriate Content' },
    { id: 'abusive_behavior', label: 'Abusive Behavior' },
    { id: 'underage_user', label: 'Underage User' },
    { id: 'harassment', label: 'Harassment' },
    { id: 'other', label: 'Other Reason' }
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peerData.id) return;
    
    setIsSubmitting(true);
    
    try {
      // Get current match
      const { data: match } = await supabase
        .from('matches')
        .select('id')
        .or(`peer_a.eq.${peerData.id},peer_b.eq.${peerData.id}`)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      
      if (match) {
        // Create report
        await supabase
          .from('reports')
          .insert({
            id: uuidv4(),
            reporter_id: peerData.id,
            reported_id: peerData.id,
            match_id: match.id,
            reason,
            resolved: false
          });
      }
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-dark-300 rounded-xl w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-dark-200">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Flag size={20} className="text-warning-500" />
                Report User
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4">
              <p className="text-gray-300 mb-4">
                Please select a reason for reporting this user. This will help us keep the community safe.
              </p>
              
              <div className="space-y-2 mb-6">
                {reportReasons.map((reportReason) => (
                  <label
                    key={reportReason.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-200 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reportReason.id}
                      checked={reason === reportReason.id}
                      onChange={() => setReason(reportReason.id)}
                      className="w-4 h-4 accent-warning-500"
                    />
                    <span className="text-gray-200">{reportReason.label}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-dark-100 text-white hover:bg-dark-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-warning-500 text-white hover:bg-warning-600 transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Loader size={16} />
                      </motion.div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;