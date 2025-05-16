import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

interface MockAuthModalProps {
  onClose: () => void;
}

const MockAuthModal: React.FC<MockAuthModalProps> = ({ onClose }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMockLogin = async (provider: string) => {
    const mockUser = {
      id: uuidv4(),
      name: "Guest",
      profile_picture: null,
      email: null,
      provider
    };

    await login(mockUser);
    onClose();
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const mockUser = {
        id: uuidv4(),
        name: email.split('@')[0] || "User",
        profile_picture: null,
        email,
        provider: 'email'
      };

      // Create user in the users table
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: mockUser.id,
          username: mockUser.name,
          gender: Math.random() > 0.5 ? 'male' : 'female',
          country: 'US',
          coins: 10,
          is_online: true,
          last_seen: new Date().toISOString()
        });

      if (dbError) {
        console.error(`[Login ${new Date().toISOString()}] Database error:`, dbError);
        throw new Error('Failed to create user');
      }

      console.log(`[Login ${new Date().toISOString()}] Mock login successful: {userId: ${mockUser.id}, email: ${mockUser.email}}`);
      await login(mockUser);
      onClose();
    } catch (err) {
      console.error(`[Login ${new Date().toISOString()}] Login error:`, err);
      setError('Failed to create user account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-dark-300 rounded-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-dark-200">
          <h2 className="text-xl font-semibold text-white">Sign in to continue</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter any email"
                className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter any password"
                className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {error && (
              <div className="text-error-500 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign in with Email'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-dark-300 text-gray-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={() => handleMockLogin('google')}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-gray-100 text-gray-800 rounded-lg transition-colors"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span className="font-medium">Continue with Google</span>
          </button>

          <button
            onClick={() => handleMockLogin('facebook')}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#1877F2] hover:bg-[#1874EA] text-white rounded-lg transition-colors"
          >
            <img src="https://static.xx.fbcdn.net/rsrc.php/yD/r/d4ZIVX-5C-b.ico" alt="Facebook" className="w-5 h-5" />
            <span className="font-medium">Continue with Facebook</span>
          </button>

          <button
            onClick={() => handleMockLogin('apple')}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-black hover:bg-gray-900 text-white rounded-lg transition-colors"
          >
            <img src="https://www.apple.com/favicon.ico" alt="Apple" className="w-5 h-5" />
            <span className="font-medium">Continue with Apple</span>
          </button>
        </div>

        <div className="px-6 pb-6 text-center">
          <p className="text-sm text-gray-400">
            This is a mock authentication system.
            <br />
            Enter any email and password to sign in.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default MockAuthModal;