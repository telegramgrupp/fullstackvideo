import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';
import { useVideo } from '../contexts/VideoContext';
import VideoControls from './VideoControls';
import MatchOverlay from './MatchOverlay';
import { Camera, Loader, Video, AlertCircle, Search, UserX } from 'lucide-react';

const VideoContainer: React.FC = () => {
  const { chatState, peerData } = useSocket();
  const { 
    localStream, 
    remoteStream, 
    hasPermission,
    isFullscreen,
    permissionError,
    requestPermission,
  } = useVideo();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(console.error);
    }
  }, [remoteStream]);

  const renderContent = () => {
    if (!hasPermission) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-full text-center px-4"
        >
          {permissionError ? (
            <>
              <AlertCircle size={64} className="text-error-500 mb-4" />
              <h2 className="text-lg font-semibold mb-2">{permissionError}</h2>
              <button 
                onClick={requestPermission}
                className="btn-primary mt-4"
              >
                Try Again
              </button>
            </>
          ) : (
            <>
              <Camera size={48} className="text-primary-500 mb-4" />
              <h2 className="text-lg font-semibold mb-2">Camera Access Required</h2>
              <p className="text-sm text-gray-400 mb-6 max-w-[200px]">
                Allow access to your camera and microphone to start chatting
              </p>
              <button 
                onClick={requestPermission}
                className="btn-primary text-sm px-6 py-2"
              >
                Allow Access
              </button>
            </>
          )}
        </motion.div>
      );
    }

    switch (chatState) {
      case 'idle':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            <Video size={64} className="text-primary-500 mb-6" />
            <h2 className="text-2xl font-semibold mb-4">Ready to Connect</h2>
            <p className="text-gray-400 mb-8 text-center max-w-md">
              Click the Match button to start chatting with someone new
            </p>
          </motion.div>
        );
      
      case 'requesting':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [1, 0.8, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="mb-6"
            >
              <Search size={64} className="text-primary-500" />
            </motion.div>
            <h2 className="text-2xl font-semibold mb-4">
              Searching for Someone Special...
            </h2>
            <p className="text-gray-400 text-center max-w-md">
              Please wait while we find your perfect match. This might take a moment.
            </p>
          </motion.div>
        );
      
      case 'connecting':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="mb-6"
            >
              <Loader size={64} className="text-primary-500" />
            </motion.div>
            <h2 className="text-2xl font-semibold mb-4">Almost There...</h2>
            <p className="text-gray-400 text-center max-w-md">
              Establishing a secure connection with your match
            </p>
          </motion.div>
        );

      case 'matched':
        if (!remoteStream && peerData.id === null) {
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <UserX size={64} className="text-warning-500 mb-6" />
              <h2 className="text-2xl font-semibold mb-4">No Video Available</h2>
              <p className="text-gray-400 text-center max-w-md">
                Your match's video stream is not available. You can try finding another match.
              </p>
            </motion.div>
          );
        }
        return null;
      
      default:
        return null;
    }
  };

  return (
    <div 
      ref={containerRef}
      id="video-container"
      className={`relative ${isFullscreen ? 'fixed inset-0' : 'h-[calc(100vh-2rem)]'} glass-panel overflow-hidden`}
    >
      <div className="absolute inset-0 flex flex-col md:flex-row">
        {/* Local Video */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full p-2 md:p-4">
          <div className="relative h-full rounded-2xl overflow-hidden glass-panel bg-black">
            {localStream && (
              <video
                id="local-video"
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-black/40 text-sm">
              You
            </div>
          </div>
        </div>

        {/* Remote Video / Match Section */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full p-2 md:p-4">
          <div className="relative h-full rounded-2xl overflow-hidden glass-panel bg-black">
            {chatState === 'matched' && remoteStream ? (
              <>
                <video
                  id="remote-video"
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <MatchOverlay />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-200 to-dark-300">
                {renderContent()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <VideoControls />
    </div>
  );
};

export default VideoContainer;