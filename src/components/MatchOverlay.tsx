import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';
import { Flag } from 'lucide-react';
import CountryFlag from './CountryFlag';

const MatchOverlay: React.FC = () => {
  const { peerData, matchStartTime } = useSocket();
  const [timeElapsed, setTimeElapsed] = useState<string>('00:00');
  const [isLive, setIsLive] = useState<boolean>(true);
  
  // Calculate time elapsed since match started
  useEffect(() => {
    if (!matchStartTime) return;
    
    const intervalId = setInterval(() => {
      const seconds = Math.floor((Date.now() - matchStartTime) / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      setTimeElapsed(
        `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
      );
      
      // Blink "LIVE" indicator
      setIsLive(prev => !prev);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [matchStartTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start"
    >
      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: isLive ? 1 : 0.5 }}
            transition={{ duration: 0.5 }}
            className="w-3 h-3 bg-error-500 rounded-full"
          />
          <span className="text-white font-medium text-sm">LIVE</span>
        </div>
        
        {/* Timer */}
        <div className="text-white font-medium text-sm">
          {timeElapsed}
        </div>
      </div>
      
      {/* Peer info */}
      <div className="flex items-center gap-3">
        {peerData.country && (
          <CountryFlag countryCode={peerData.country} size={24} />
        )}
        
        {peerData.gender && (
          <div className="bg-dark-200/80 backdrop-blur-sm text-white px-2 py-1 rounded text-sm font-medium">
            {peerData.gender === 'male' ? 'M' : peerData.gender === 'female' ? 'F' : 'X'}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MatchOverlay;