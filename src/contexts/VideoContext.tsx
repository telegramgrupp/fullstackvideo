import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const SEGMENT_DURATION = 60000;
const MAX_RETRIES = 3;
const STREAM_READY_TIMEOUT = 3000;
const VIDEO_LOAD_TIMEOUT = 15000;
const VIDEO_LOAD_RETRY_DELAY = 2000;

interface VideoContextType {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isFullscreen: boolean;
  hasPermission: boolean;
  showStats: boolean;
  isRecording: boolean;
  permissionError: string | null;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleFullscreen: () => void;
  toggleStats: () => void;
  requestPermission: () => Promise<boolean>;
  stopStreams: () => void;
}

const VideoContext = createContext<VideoContextType | null>(null);

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) throw new Error('useVideo must be used within VideoProvider');
  return context;
};

interface VideoProviderProps {
  children: ReactNode;
}

export const VideoProvider: React.FC<VideoProviderProps> = ({ children }) => {
  const isFakeVideoEnabled = false;
  const { socket, chatState, peerData } = useSocket();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const currentMatchIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const fakeVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvasRef.current = canvas;
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMatchReady = async ({ matchId }: { matchId: string }) => {
      if (!user?.id) return;

      console.log(`[VideoContext ${new Date().toISOString()}] handleMatchReady called: {matchId: ${matchId}}`);

      try {
        const { data: match, error } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .maybeSingle();

        if (error) {
          console.error(`[VideoContext ${new Date().toISOString()}] Error fetching match:`, error);
          showError('Failed to fetch match');
          return;
        }

        if (match && currentMatchIdRef.current !== match.id) {
          console.log(`[VideoContext ${new Date().toISOString()}] Found current match:`, match.id);
          currentMatchIdRef.current = match.id;

          if (!peerData.id && !remoteStream) {
            if (isFakeVideoEnabled) {
              const videoUrl = await fetchRandomVideo();
              if (videoUrl) {
                console.log(`[VideoContext ${new Date().toISOString()}] Selected fake video:`, videoUrl);
                const stream = await loadVideo(videoUrl);
                if (stream) {
                  setRemoteStream(stream);
                } else {
                  showError('Failed to load fake video stream');
                }
              } else {
                showError('No fake video available');
              }
            } else {
              console.log(`[VideoContext ${new Date().toISOString()}] Fake video functionality is disabled, skipping fetchRandomVideo`);
            }
          }
        }
      } catch (error) {
        console.error(`[VideoContext ${new Date().toISOString()}] Error in match setup:`, error);
        showError('Failed to set up match');
      }
    };

    socket.on('match_ready', handleMatchReady);

    return () => {
      socket.off('match_ready', handleMatchReady);
    };
  }, [socket, user?.id]);

  useEffect(() => {
    if (chatState !== 'matched' || !user?.id) return;

    const setupMatch = async () => {
      console.log(`[VideoContext ${new Date().toISOString()}] Setting up match for user: {userId: ${user.id}}`);

      const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .eq('peer_a', user.id)
        .is('ended_at', null)
        .maybeSingle();

      console.log(`[VideoContext ${new Date().toISOString()}] setupMatch query result: {userId: ${user.id}, result: ${JSON.stringify(match)}, error: ${JSON.stringify(error)}}`);

      if (error) {
        console.error(`[VideoContext ${new Date().toISOString()}] Error fetching match:`, error);
        showError('Failed to fetch match');
        return;
      }

      if (match && currentMatchIdRef.current !== match.id) {
        console.log(`[VideoContext ${new Date().toISOString()}] Found current match:`, match.id);
        currentMatchIdRef.current = match.id;

        if (!peerData.id && !remoteStream) {
          if (isFakeVideoEnabled) {
            const videoUrl = await fetchRandomVideo();
            if (videoUrl) {
              console.log(`[VideoContext ${new Date().toISOString()}] Selected fake video:`, videoUrl);
              const stream = await loadVideo(videoUrl);
              if (stream) {
                setRemoteStream(stream);
              } else {
                showError('Failed to load fake video stream');
              }
            } else {
              showError('No fake video available');
            }
          } else {
            console.log(`[VideoContext ${new Date().toISOString()}] Fake video functionality is disabled, skipping fetchRandomVideo`);
          }
        }
      }
    };

    setupMatch();
  }, [chatState, user?.id, peerData.id]);

  useEffect(() => {
    if (remoteStream && !isRecording && currentMatchIdRef.current && chatState === 'matched') {
      console.log('Starting recording for match:', currentMatchIdRef.current);
      startRecording();
    }
  }, [remoteStream, isRecording, chatState]);

  useEffect(() => {
    if (chatState === 'ended' && isRecording) {
      console.log('Match ended, preparing to stop recording...');
      const stopRecordingAsync = async () => {
        const matchId = currentMatchIdRef.current;
        if (!matchId) {
          console.warn('No match ID available when stopping recording');
          return;
        }

        await new Promise<void>((resolve) => {
          if (mediaRecorderRef.current?.state !== 'inactive') {
            mediaRecorderRef.current?.addEventListener('stop', () => resolve(), { once: true });
            stopRecording();
          } else {
            resolve();
          }
        });
      };
      stopRecordingAsync();
      stopStreams();
    }
  }, [chatState, isRecording]);

  const fetchRandomVideo = async () => {
    if (!isFakeVideoEnabled) {
      console.log(`[VideoContext ${new Date().toISOString()}] Fake video functionality is disabled, skipping fetchRandomVideo`);
      return null;
    }

    try {
      const { data: files, error } = await supabase.storage
        .from('fakevideos')
        .list();

      if (error) throw error;

      console.log(`[VideoContext ${new Date().toISOString()}] Available fake videos: {count: ${files?.length || 0}}`);

      const validFiles = files?.filter(file => 
        file.name.toLowerCase().endsWith('.webm') || 
        file.name.toLowerCase().endsWith('.mp4')
      ) || [];

      if (!validFiles.length) {
        throw new Error('No supported video formats found');
      }

      const randomVideo = validFiles[Math.floor(Math.random() * validFiles.length)];
      const { data: { publicUrl } } = supabase.storage
        .from('fakevideos')
        .getPublicUrl(randomVideo.name);

      return publicUrl;
    } catch (error) {
      console.error(`[VideoContext ${new Date().toISOString()}] Error fetching fake video:`, error);
      return null;
    }
  };

  const loadVideo = async (videoUrl: string, retryCount = 0): Promise<MediaStream | null> => {
    return new Promise((resolve) => {
      console.log('[VideoContext] Loading video:', videoUrl);

      const videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.crossOrigin = 'anonymous';
      videoEl.playsInline = true;

      let loadTimeout: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(loadTimeout);
        videoEl.removeEventListener('canplaythrough', onCanPlayThrough);
        videoEl.removeEventListener('error', onError);
      };

      const onCanPlayThrough = async () => {
        cleanup();
        try {
          await videoEl.play();
          console.log('[VideoContext] Video playback started');

          const stream = videoEl.captureStream();
          const audioTracks = stream.getAudioTracks();
          
          console.log('[VideoContext] Stream tracks:', {
            video: stream.getVideoTracks().length,
            audio: audioTracks.length
          });

          const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();

          const safeConstraints: MediaTrackConstraints = {};
          if (supportedConstraints.echoCancellation) safeConstraints.echoCancellation = true;
          if (supportedConstraints.noiseSuppression) safeConstraints.noiseSuppression = true;
          if (supportedConstraints.autoGainControl) safeConstraints.autoGainControl = true;

          audioTracks.forEach(track => {
            track.enabled = true;
            if (Object.keys(safeConstraints).length > 0) {
              track.applyConstraints(safeConstraints).catch(err => {
                console.warn('[VideoContext] Could not apply audio constraints:', err.name);
              });
            }
          });

          fakeVideoRef.current = videoEl;
          resolve(stream);
        } catch (err) {
          console.error('[VideoContext] Video playback error:', err);
          handleLoadError();
        }
      };

      const onError = () => {
        cleanup();
        console.error('[VideoContext] Video load error:', videoEl.error);
        handleLoadError();
      };

      const handleLoadError = async () => {
        if (retryCount < MAX_RETRIES) {
          console.log(`[VideoContext] Retrying video load (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(r => setTimeout(r, VIDEO_LOAD_RETRY_DELAY));
          const newStream = await loadVideo(videoUrl, retryCount + 1);
          resolve(newStream);
        } else {
          console.error('[VideoContext] Max retry attempts reached');
          resolve(null);
        }
      };

      loadTimeout = setTimeout(() => {
        cleanup();
        console.warn(`[VideoContext] Video load timeout (${retryCount + 1}/${MAX_RETRIES})`);
        handleLoadError();
      }, VIDEO_LOAD_TIMEOUT);

      videoEl.addEventListener('canplaythrough', onCanPlayThrough);
      videoEl.addEventListener('error', onError);

      videoEl.src = videoUrl;
      videoEl.load();
    });
  };

  const startRecording = async () => {
    if (!canvasRef.current || !user) {
      console.error('Canvas not initialized or user not found');
      return;
    }

    const streamReadyPromise = new Promise<boolean>((resolve) => {
      const checkStreams = () => {
        const localVideo = document.getElementById('local-video') as HTMLVideoElement;
        const remoteVideo = document.getElementById('remote-video') as HTMLVideoElement;

        if (localVideo?.readyState === 4 && remoteVideo?.readyState === 4) {
          resolve(true);
        }
      };

      const interval = setInterval(checkStreams, 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve(false);
      }, STREAM_READY_TIMEOUT);
    });

    const streamsReady = await streamReadyPromise;
    if (!streamsReady) {
      console.warn('Streams not ready after timeout');
      return;
    }

    if (!remoteStream || !localStream) {
      console.warn('Streams not available when starting recording');
      showError('Video veya mikrofon akışı hazır değil.');
      return;
    }

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      const drawFrame = () => {
        const localVideo = document.getElementById('local-video') as HTMLVideoElement;
        const remoteVideo = document.getElementById('remote-video') as HTMLVideoElement;

        if (localVideo && remoteVideo) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(remoteVideo, 0, 0, canvas.width / 2, canvas.height);
          ctx.drawImage(localVideo, canvas.width / 2, 0, canvas.width / 2, canvas.height);
        }

        animationFrameRef.current = requestAnimationFrame(drawFrame);
      };

      drawFrame();

      const stream = canvas.captureStream(30);

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();

      if (localStream.getAudioTracks().length > 0) {
        const localSource = audioContext.createMediaStreamSource(localStream);
        localSource.connect(destination);
      }

      if (remoteStream.getAudioTracks().length > 0) {
        const remoteSource = audioContext.createMediaStreamSource(remoteStream);
        remoteSource.connect(destination);
      }

      const audioTracks = destination.stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = true;
        stream.addTrack(track);
      });

      const finalAudioTracks = stream.getAudioTracks();
      console.log(
        'Final stream audio tracks:',
        finalAudioTracks.map((track) => ({ 
          id: track.id, 
          label: track.label, 
          enabled: track.enabled 
        }))
      );

      if (finalAudioTracks.length === 0) {
        console.warn('No audio tracks in recording stream');
        showError('Kayıt akışında ses bulunamadı.');
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 3000000,
        audioBitsPerSecond: 128000
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('Recorded chunk:', event.data.size, 'bytes');
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        console.log('Recording completed:', blob.size, 'bytes');

        const matchId = currentMatchIdRef.current;
        if (blob.size > 0 && matchId) {
          const url = await uploadRecording(blob);
          if (url) {
            console.log('Updating match with video URL:', { matchId, url });
            const { error: updateError } = await supabase
              .from('matches')
              .update({ video_url: url })
              .eq('id', matchId)
              .select()
              .single();

            if (updateError) {
              console.error('Failed to update match with video URL:', updateError);
              showError('Failed to save recording');
            } else {
              console.log('Match successfully updated with video URL');
              showSuccess('Recording saved successfully');
            }
          } else {
            console.error('Upload failed, no URL returned');
            showError('Failed to upload recording');
          }
        } else {
          console.error('Empty recording or missing match ID');
          showError('Recording failed: empty video or missing match ID');
        }

        chunksRef.current = [];
        currentMatchIdRef.current = null;
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(SEGMENT_DURATION);
      setIsRecording(true);
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      showError('Failed to start recording');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    try {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }

      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      showError('Failed to stop recording');
    }
  };

  const uploadRecording = async (blob: Blob): Promise<string | null> => {
    if (!user) {
      console.warn('No user authenticated');
      return null;
    }

    const fileName = `${user.id}/${uuidv4()}.webm`;
    console.log('Starting upload:', fileName);

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        const { data, error } = await supabase.storage
          .from('recordings')
          .upload(fileName, blob, {
            contentType: 'video/webm',
            cacheControl: '3600'
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('recordings').getPublicUrl(fileName);

        console.log('Upload complete:', publicUrl);
        showSuccess('Recording uploaded successfully');
        return publicUrl;
      } catch (error) {
        console.error(`Upload attempt ${attempt + 1} failed:`, error);
        attempt++;

        if (attempt === MAX_RETRIES) {
          showError('Failed to upload recording');
          return null;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    return null;
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      setPermissionError(null);
      console.log('[VideoContext] Requesting media permissions');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Media devices not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true }
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          await videoTrack.applyConstraints({
            width: { min: 640, ideal: CANVAS_WIDTH / 2, max: CANVAS_WIDTH },
            height: { min: 480, ideal: CANVAS_HEIGHT, max: CANVAS_HEIGHT * 1.5 },
            frameRate: { min: 24, ideal: 30 }
          });
        } catch (err) {
          console.warn('[VideoContext] Could not apply ideal video constraints:', err);
        }
      }

      setLocalStream(stream);
      setHasPermission(true);
      return true;
    } catch (error: any) {
      console.error('[VideoContext] Permission error:', error);

      if (error.name === 'OverconstrainedError') {
        console.log('[VideoContext] Retrying with basic constraints');
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          setLocalStream(basicStream);
          setHasPermission(true);
          return true;
        } catch (retryError) {
          setPermissionError('Could not access camera with any settings');
        }
      } else {
        setPermissionError(error.message || 'Failed to access media devices');
      }

      setHasPermission(false);
      return false;
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleFullscreen = () => {
    if (!fullscreenRef.current) return;

    if (!document.fullscreenElement) {
      fullscreenRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch((err) => console.error('Fullscreen failed:', err));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch((err) => console.error('Exit fullscreen failed:', err));
    }
  };

  const toggleStats = () => setShowStats(!showStats);

  const stopStreams = () => {
    if (fakeVideoRef.current) {
      console.log('Stopping fake video...');
      fakeVideoRef.current.pause();
      fakeVideoRef.current.src = '';
      fakeVideoRef.current.load();
      fakeVideoRef.current = null;
    }

    if (audioContextRef.current) {
      console.log('Closing AudioContext...');
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    [localStream, remoteStream].forEach((stream) => {
      if (stream) {
        console.log('Stopping stream:', stream);
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log('Stopped track:', track);
        });
      }
    });

    setLocalStream(null);
    setRemoteStream(null);
    setHasPermission(false);
  };

  useEffect(() => {
    return () => {
      stopStreams();
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <VideoContext.Provider value={{
      localStream,
      remoteStream,
      isMuted,
      isVideoOff,
      isFullscreen,
      hasPermission,
      showStats,
      isRecording,
      permissionError,
      toggleMute,
      toggleVideo,
      toggleFullscreen,
      toggleStats,
      requestPermission,
      stopStreams
    }}>
      {children}
    </VideoContext.Provider>
  );
};