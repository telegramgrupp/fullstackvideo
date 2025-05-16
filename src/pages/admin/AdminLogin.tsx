import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Lock, VideoIcon } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const { isAdmin, login } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [isAdmin, navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const success = await login(password);
    
    if (success) {
      navigate('/admin/dashboard');
    } else {
      showError('Invalid password');
    }
    
    setIsLoading(false);
  };
  
  return (
    <div className="min-h-screen bg-dark-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-300 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8 flex flex-col items-center">
          <div className="mb-6 flex items-center gap-2">
            <VideoIcon size={32} className="text-primary-500" />
            <h1 className="text-2xl font-bold text-white">MonkeyChat Admin</h1>
          </div>
          
          <form onSubmit={handleSubmit} className="w-full">
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-dark-100 rounded-lg bg-dark-200 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter admin password"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>This area is restricted to administrators only.</p>
            <p className="mt-1">
              <a href="/" className="text-primary-400 hover:text-primary-300">
                Return to home page
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;