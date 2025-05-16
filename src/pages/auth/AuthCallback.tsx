import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Loader } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (user) {
          // Check if profile exists
          const { data: profile } = await supabase
            .from('users')
            .select('username')
            .eq('id', user.id)
            .single();
          
          // Redirect based on profile completion
          if (profile?.username) {
            navigate('/');
          } else {
            navigate('/profile/setup');
          }
        } else {
          navigate('/auth/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/auth/login');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-dark-300 flex items-center justify-center">
      <div className="text-center">
        <Loader size={32} className="animate-spin text-primary-500 mb-4" />
        <p className="text-gray-400">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;