import React from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { Apple, Facebook, Github } from 'lucide-react';

const SocialAuth: React.FC = () => {
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Social login error:', error);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => handleSocialLogin('google')}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-lg transition-colors"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
        <span className="font-medium">Continue with Google</span>
      </button>

      <button
        onClick={() => handleSocialLogin('facebook')}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#1877F2] hover:bg-[#1874EA] text-white rounded-lg transition-colors"
      >
        <Facebook size={20} />
        <span className="font-medium">Continue with Facebook</span>
      </button>

      <button
        onClick={() => handleSocialLogin('apple')}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-black hover:bg-gray-900 text-white rounded-lg transition-colors"
      >
        <Apple size={20} />
        <span className="font-medium">Continue with Apple</span>
      </button>
    </div>
  );
};

export default SocialAuth;