import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { ChatState } from '../types';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  chatState: ChatState;
  peerData: {
    id: string | null;
    country: string | null;
    gender: string | null;
  };
  matchStartTime: number | null;
  findMatch: (options?: { gender?: string; country?: string }) => void;
  endMatch: () => void;
  reportUser: (reason: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === null) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const RETRY_MULTIPLIER = 1.5;
const JITTER_FACTOR = 0.2;
const MATCH_SEARCH_TIMEOUT = 10000; // 10 seconds
const MAX_SEARCH_ATTEMPTS = 5;

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [peerData, setPeerData] = useState({
    id: null as string | null,
    country: null as string | null,
    gender: null as string | null,
  });
  const [matchStartTime, setMatchStartTime] = useState<number | null>(null);
  const [retryDelay, setRetryDelay] = useState(INITIAL_RETRY_DELAY);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchAttempts, setSearchAttempts] = useState(0);

  useEffect(() => {
    if (user) {
      console.log(`[SocketContext ${new Date().toISOString()}] Initializing socket connection...`);
      
      const socketInstance = io(import.meta.env.VITE_SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        query: { userId: user.id },
        reconnectionAttempts: Infinity,
        reconnectionDelay: retryDelay,
        reconnectionDelayMax: MAX_RETRY_DELAY,
        timeout: 60000,
        maxHttpBufferSize: 1e6
      });

      socketInstance.on('connect', () => {
        console.log(`[SocketContext ${new Date().toISOString()}] Socket connected successfully`);
        setConnected(true);
        setRetryDelay(INITIAL_RETRY_DELAY);
      });

      socketInstance.on('connect_error', (error) => {
        console.error(`[SocketContext ${new Date().toISOString()}] Socket connection error: {error: ${error.message}}`);
        setConnected(false);
        
        // Apply exponential backoff with jitter
        const jitter = Math.random() * JITTER_FACTOR * retryDelay;
        const nextDelay = Math.min(retryDelay * RETRY_MULTIPLIER + jitter, MAX_RETRY_DELAY);
        setRetryDelay(nextDelay);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log(`[SocketContext ${new Date().toISOString()}] Socket disconnected: {reason: ${reason}}`);
        setConnected(false);
        setChatState('idle');
        setPeerData({ id: null, country: null, gender: null });
        setMatchStartTime(null);
        
        // Clear any existing timeouts
        if (searchTimeout) {
          clearTimeout(searchTimeout);
          setSearchTimeout(null);
        }
      });

      socketInstance.on('match_ready', ({ matchId }) => {
        console.log('Match ready:', matchId);
        socketInstance.emit('setup_match', matchId);
      });

      socketInstance.on('match_found', (matchData) => {
        console.log(`[SocketContext ${new Date().toISOString()}] Match found: {matchData: ${JSON.stringify(matchData)}}`);
        
        // Clear search timeout and reset attempts
        if (searchTimeout) {
          clearTimeout(searchTimeout);
          setSearchTimeout(null);
        }
        setSearchAttempts(0);
        
        setChatState('matched');
        setPeerData({
          id: matchData.peerId,
          country: matchData.country,
          gender: matchData.gender,
        });
        setMatchStartTime(Date.now());
      });

      socketInstance.on('fake_match', (fakeData) => {
        console.log('Fake match created:', fakeData);
        
        // If we haven't exceeded max attempts, continue searching
        if (searchAttempts < MAX_SEARCH_ATTEMPTS) {
          console.log(`Continuing search for real match (attempt ${searchAttempts + 1}/${MAX_SEARCH_ATTEMPTS})`);
          setSearchAttempts(prev => prev + 1);
          
          // Set a timeout to try finding another match
          const timeout = setTimeout(() => {
            socketInstance.emit('find_match');
          }, MATCH_SEARCH_TIMEOUT);
          
          setSearchTimeout(timeout);
        } else {
          console.log('Max search attempts reached, settling for fake match');
          setSearchAttempts(0);
          setChatState('matched');
          setPeerData({
            id: null,
            country: fakeData.country,
            gender: fakeData.gender,
          });
          setMatchStartTime(Date.now());
        }
      });

      socketInstance.on('match_ended', () => {
        console.log('Match ended');
        
        // Clear any existing search timeout
        if (searchTimeout) {
          clearTimeout(searchTimeout);
          setSearchTimeout(null);
        }
        
        setChatState('ended');
        setTimeout(() => {
          setChatState('idle');
          setPeerData({ id: null, country: null, gender: null });
          setMatchStartTime(null);
          setSearchAttempts(0);
        }, 2000);
      });

      socketInstance.on('no_matches_available', () => {
        console.log('No matches available, continuing search...');
        // Keep the state as 'requesting' to indicate ongoing search
        setChatState('requesting');
      });

      setSocket(socketInstance);

      return () => {
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
        if (socketInstance.connected) {
          socketInstance.disconnect();
        }
        console.log(`[SocketContext ${new Date().toISOString()}] Cleaning up socket connection...`);
      };
    }
  }, [user]);

  const findMatch = (options = {}) => {
    if (socket && connected && chatState === 'idle') {
      console.log(`[SocketContext ${new Date().toISOString()}] Finding match with options: {options: ${JSON.stringify(options)}}`);
      setChatState('requesting');
      setSearchAttempts(0);
      socket.emit('find_match', options);

      // Clear any existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Set a timeout to retry the match search if no response
      const timeout = setTimeout(() => {
        if (chatState === 'requesting' && searchAttempts < MAX_SEARCH_ATTEMPTS) {
          console.log(`Retrying match search (attempt ${searchAttempts + 1}/${MAX_SEARCH_ATTEMPTS})`);
          socket.emit('find_match', options);
          setSearchAttempts(prev => prev + 1);
        }
      }, MATCH_SEARCH_TIMEOUT);

      setSearchTimeout(timeout);
    }
  };

  const endMatch = () => {
    if (socket && connected && (chatState === 'matched' || chatState === 'requesting')) {
      console.log('Ending match');
      
      // Clear search timeout if it exists
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
      
      socket.emit('end_match');
      setChatState('ended');
      
      setTimeout(() => {
        setChatState('idle');
        setPeerData({ id: null, country: null, gender: null });
        setMatchStartTime(null);
        setSearchAttempts(0);
      }, 2000);
    }
  };

  const reportUser = (reason: string) => {
    if (socket && connected && peerData.id) {
      console.log('Reporting user:', peerData.id, 'for reason:', reason);
      socket.emit('report_user', {
        reportedId: peerData.id,
        reason,
      });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      chatState,
      peerData,
      matchStartTime,
      findMatch,
      endMatch,
      reportUser,
    }}>
      {children}
    </SocketContext.Provider>
  );
};