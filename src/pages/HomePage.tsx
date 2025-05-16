import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VideoProvider } from '../contexts/VideoContext';
import VideoContainer from '../components/VideoContainer';
import CoinPackages from '../components/CoinPackages';
import MockAuthModal from '../components/auth/MockAuthModal';
import ProfileSetup from '../components/auth/ProfileSetup';
import { useAuth } from '../contexts/AuthContext';
import { Video, Globe2, Users, LogOut, UserCircle, VideoIcon } from 'lucide-react';

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [showCoinPackages, setShowCoinPackages] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  
  const features = [
    {
      icon: <Globe2 size={24} className="text-primary-500" />,
      title: "Global Connections",
      description: "Chat with people from all around the world"
    },
    {
      icon: <Video size={24} className="text-primary-500" />,
      title: "HD Video Quality",
      description: "Crystal clear video and audio streaming"
    },
    {
      icon: <Users size={24} className="text-primary-500" />,
      title: "Smart Matching",
      description: "Find like-minded people instantly"
    }
  ];

  const handleStart = () => {
    if (!user) {
      setShowAuthModal(true);
    } else if (!user.bio) {
      setShowProfileSetup(true);
    } else {
      setIsStarted(true);
    }
  };
  
  if (showProfileSetup) {
    return (
      <ProfileSetup 
        mode={user?.bio ? 'edit' : 'create'}
        onClose={() => setShowProfileSetup(false)}
      />
    );
  }
  
  if (isStarted) {
    return (
      <VideoProvider>
        <div className="min-h-screen bg-gradient-to-br from-dark-300 via-dark-200 to-dark-100">
          <header className="absolute top-0 left-0 right-0 z-50 py-4 px-6 flex justify-between items-center bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <VideoIcon size={24} className="text-primary-500" />
              <h1 className="text-xl font-bold text-white">MonkeyChat</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {user && (
                <>
                  <button
                    onClick={() => setShowProfileSetup(true)}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    title="Edit Profile"
                  >
                    <UserCircle size={20} className="text-white" />
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setIsStarted(false);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    title="Log Out"
                  >
                    <LogOut size={20} className="text-white" />
                  </button>
                </>
              )}
            </div>
          </header>
          
          <main className="h-screen p-4">
            <VideoContainer />
          </main>
          
          {showCoinPackages && (
            <CoinPackages onClose={() => setShowCoinPackages(false)} />
          )}
        </div>
      </VideoProvider>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-300 via-dark-200 to-dark-100 p-6 flex">
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto">
        {user && (
          <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6 flex justify-between items-center bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <VideoIcon size={24} className="text-primary-500" />
              <h1 className="text-xl font-bold text-white">MonkeyChat</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfileSetup(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                title="Edit Profile"
              >
                <UserCircle size={20} className="text-white" />
              </button>
              <button
                onClick={() => {
                  logout();
                  setIsStarted(false);
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                title="Log Out"
              >
                <LogOut size={20} className="text-white" />
              </button>
            </div>
          </header>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Connect with <span className="text-primary-500">Random People</span> Worldwide
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Start anonymous video chats with people from around the globe. Make new friends, share stories, and explore different cultures.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-6"
        >
          <button
            onClick={handleStart}
            className="btn-primary text-lg"
          >
            Start Chatting
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="glass-panel p-6"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {showAuthModal && (
        <MockAuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};

export default HomePage;