import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin as supabase } from '../lib/supabaseAdmin.js';

export default function setupSocketHandlers(io) {
  const onlineUsers = new Map();
  const searchingUsers = new Map();
  
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    
    if (!userId) {
      socket.disconnect();
      return;
    }
    
    onlineUsers.set(userId, socket.id);
    
    // Update user status in database
    supabase
      .from('users')
      .update({ 
        is_online: true,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId)
      .then(() => {
        console.log(`User ${userId} connected`);
      })
      .catch(console.error);
    
    socket.on('find_match', async (options = {}) => {
      const { gender, country } = options;
      
      // Check if user is banned
      const { data: user, error } = await supabase
        .from('users')
        .select('is_banned')
        .eq('id', userId)
        .single();
      
      if (error || user?.is_banned) {
        socket.emit('error', { message: 'You are banned from using this service' });
        return;
      }
      
      searchingUsers.set(userId, {
        socketId: socket.id,
        preferences: { gender, country }
      });
      
      findMatch(userId, options);
    });
    
    socket.on('signal', (data) => {
      const { to, signal } = data;
      
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('signal', {
          from: userId,
          signal
        });
      }
    });

    socket.on('setup_match', async (matchId) => {
      const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) {
        console.error('Setup match error:', error);
        return;
      }

      // Emit match data back to the client
      socket.emit('match_setup_complete', { matchId, match });
    });
    
    socket.on('end_match', async () => {
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .or(`peer_a.eq.${userId},peer_b.eq.${userId}`)
        .is('ended_at', null)
        .single();
      
      if (match) {
        const now = new Date();
        const duration = Math.floor((now.getTime() - new Date(match.started_at).getTime()) / 1000);
        
        await supabase
          .from('matches')
          .update({
            ended_at: now.toISOString(),
            duration
          })
          .eq('id', match.id);
        
        if (!match.is_fake && match.peer_b) {
          const otherPeerId = match.peer_a === userId ? match.peer_b : match.peer_a;
          const otherPeerSocketId = onlineUsers.get(otherPeerId);
          
          if (otherPeerSocketId) {
            io.to(otherPeerSocketId).emit('match_ended');
          }
        }
      }
      
      socket.emit('match_ended');
      searchingUsers.delete(userId);
    });
    
    socket.on('report_user', async (data) => {
      const { reportedId, reason } = data;
      
      const { data: match } = await supabase
        .from('matches')
        .select('id')
        .or(`and(peer_a.eq.${userId},peer_b.eq.${reportedId}),and(peer_a.eq.${reportedId},peer_b.eq.${userId})`)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      
      if (match) {
        await supabase
          .from('reports')
          .insert({
            id: uuidv4(),
            reporter_id: userId,
            reported_id: reportedId,
            match_id: match.id,
            reason,
            resolved: false
          });
      }
    });
    
    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected`);
      
      onlineUsers.delete(userId);
      searchingUsers.delete(userId);
      
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .or(`peer_a.eq.${userId},peer_b.eq.${userId}`)
        .is('ended_at', null)
        .single();
      
      if (match) {
        const now = new Date();
        const duration = Math.floor((now.getTime() - new Date(match.started_at).getTime()) / 1000);
        
        await supabase
          .from('matches')
          .update({
            ended_at: now.toISOString(),
            duration
          })
          .eq('id', match.id);
        
        if (!match.is_fake && match.peer_b) {
          const otherPeerId = match.peer_a === userId ? match.peer_b : match.peer_a;
          const otherPeerSocketId = onlineUsers.get(otherPeerId);
          
          if (otherPeerSocketId) {
            io.to(otherPeerSocketId).emit('match_ended');
          }
        }
      }
      
      await supabase
        .from('users')
        .update({ 
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);
    });
  });
  
  async function findMatch(userId, preferences = {}) {
    if (!onlineUsers.has(userId)) return;
    
    const userSocketId = onlineUsers.get(userId);
    const searchingUser = searchingUsers.get(userId);
    
    if (!searchingUser) return;
    
    const { gender, country } = preferences;
    
    for (const [potentialPeerId, potentialPeer] of searchingUsers.entries()) {
      if (potentialPeerId === userId) continue;
      
      let isCompatible = true;
      
      if (gender && potentialPeer.preferences.gender) {
        const { data: user } = await supabase
          .from('users')
          .select('gender')
          .eq('id', userId)
          .single();
          
        if (user?.gender !== potentialPeer.preferences.gender) {
          isCompatible = false;
        }
      }
      
      if (country && potentialPeer.preferences.country) {
        const { data: user } = await supabase
          .from('users')
          .select('country')
          .eq('id', userId)
          .single();
          
        if (user?.country !== potentialPeer.preferences.country) {
          isCompatible = false;
        }
      }
      
      if (isCompatible) {
        searchingUsers.delete(userId);
        searchingUsers.delete(potentialPeerId);
        
        const matchId = uuidv4();
        
        try {
          // Insert match into database
          await supabase
            .from('matches')
            .insert({
              id: matchId,
              peer_a: userId,
              peer_b: potentialPeerId,
              is_fake: false,
              started_at: new Date().toISOString()
            });

          // Fetch user data for both peers
          const [{ data: user1 }, { data: user2 }] = await Promise.all([
            supabase.from('users').select('gender, country').eq('id', userId).single(),
            supabase.from('users').select('gender, country').eq('id', potentialPeerId).single()
          ]);

          // First emit match_ready to both users
          io.to(userSocketId).emit('match_ready', { matchId });
          io.to(potentialPeer.socketId).emit('match_ready', { matchId });

          // Then emit match_found with peer details
          io.to(userSocketId).emit('match_found', {
            matchId,
            peerId: potentialPeerId,
            gender: user2?.gender,
            country: user2?.country
          });
          
          io.to(potentialPeer.socketId).emit('match_found', {
            matchId,
            peerId: userId,
            gender: user1?.gender,
            country: user1?.country
          });
        } catch (error) {
          console.error('Error creating match:', error);
          searchingUsers.set(userId, searchingUser);
          searchingUsers.set(potentialPeerId, potentialPeer);
          io.to(userSocketId).emit('error', { message: 'Failed to create match' });
          io.to(potentialPeer.socketId).emit('error', { message: 'Failed to create match' });
        }
        
        return;
      }
    }
    
    setTimeout(async () => {
      if (!searchingUsers.has(userId) || !onlineUsers.has(userId)) return;
      
      const matchId = uuidv4();
      
      try {
        // Insert fake match into database
        await supabase
          .from('matches')
          .insert({
            id: matchId,
            peer_a: userId,
            peer_b: null,
            is_fake: true,
            started_at: new Date().toISOString()
          });

        const fakeGender = gender || ['male', 'female'][Math.floor(Math.random() * 2)];
        const fakeCountry = country || ['US', 'GB', 'CA', 'DE', 'FR', 'JP', 'IN', 'BR'][Math.floor(Math.random() * 8)];
        
        searchingUsers.delete(userId);

        // First emit match_ready
        io.to(userSocketId).emit('match_ready', { matchId });
        
        // Then emit fake_match with details
        io.to(userSocketId).emit('fake_match', {
          matchId,
          gender: fakeGender,
          country: fakeCountry
        });
      } catch (error) {
        console.error('Error creating fake match:', error);
        io.to(userSocketId).emit('error', { message: 'Failed to create match' });
      }
    }, 3000);
  }
}