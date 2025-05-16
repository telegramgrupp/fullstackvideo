import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';

interface User {
  id: string;
  name: string | null;
  profile_picture: string | null;
  email: string | null;
  provider?: string;
  bio?: string;
  gender?: string;
  age?: number;
  country?: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  coins: number;
  loading: boolean;
  error: string | null;
  login: (mockUser: User) => Promise<void>;
  logout: () => void;
  updateProfile: (data: any) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number, reason: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [coins, setCoins] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // Fetch current coin balance
      supabase
        .from('users')
        .select('coins')
        .eq('id', parsedUser.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching user coins:', error);
            return;
          }
          if (data) {
            setCoins(data.coins);
          }
        })
        .catch(console.error);
    }
    setLoading(false);
  }, []);

  const login = async (mockUser: User) => {
    try {
      // Check if user exists first
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', mockUser.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existingUser) {
        // User doesn't exist, create new user
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: mockUser.id,
            username: mockUser.name || `User${mockUser.id.substring(0, 6)}`,
            coins: 10,
            is_online: true,
            last_seen: new Date().toISOString()
          });

        if (createError) throw createError;
        setCoins(10);
      } else {
        // User exists, update their online status
        const { error: updateError } = await supabase
          .from('users')
          .update({
            is_online: true,
            last_seen: new Date().toISOString()
          })
          .eq('id', mockUser.id);

        if (updateError) throw updateError;
        
        // Update mockUser with existing data
        mockUser = {
          ...mockUser,
          profile_picture: existingUser.profile_picture,
          bio: existingUser.bio,
          gender: existingUser.gender,
          age: existingUser.age,
          country: existingUser.country
        };
        setCoins(existingUser.coins);
      }

      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
      setError(null);
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to login');
      throw error;
    }
  };

  const logout = () => {
    if (user) {
      // Update user's online status
      supabase
        .from('users')
        .update({
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id)
        .then(() => {
          setUser(null);
          localStorage.removeItem('user');
          setIsAdmin(false);
          localStorage.removeItem('isAdmin');
          setError(null);
          setCoins(0);
        })
        .catch(console.error);
    }
  };

  const updateProfile = async (data: any) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...data
    };

    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const addCoins = async (amount: number) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          amount: Math.abs(amount),
          type: 'purchase',
          reason: 'Coin purchase'
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add coins');
      }

      setCoins(data.data.newBalance);
    } catch (error) {
      console.error('Failed to add coins:', error);
      setError(error instanceof Error ? error.message : 'Failed to add coins');
      throw error;
    }
  };

  const spendCoins = async (amount: number, reason: string): Promise<boolean> => {
    if (!user || coins < amount) return false;
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          amount: -Math.abs(amount),
          type: 'spend',
          reason
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to spend coins');
        return false;
      }

      setCoins(data.data.newBalance);
      return true;
    } catch (error) {
      console.error('Failed to spend coins:', error);
      setError(error instanceof Error ? error.message : 'Failed to spend coins');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      coins,
      loading,
      error,
      login,
      logout,
      updateProfile,
      addCoins,
      spendCoins
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };