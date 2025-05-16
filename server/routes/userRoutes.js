import express from 'express';
import { supabaseAdmin as supabase } from '../lib/supabaseAdmin.js';

export default function userRoutes() {
  const router = express.Router();

  // Get all users
  router.get('/', async (req, res) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) throw error;
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user by ID
  router.get('/:id', async (req, res) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.params.id)
        .single();
      
      if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new user
  router.post('/', async (req, res) => {
    try {
      const { id, coins } = req.body;
      
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          id,
          username: `User${id.substring(0, 6)}`,
          coins: coins || 10,
          is_online: true,
          last_seen: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user
  router.put('/:id', async (req, res) => {
    try {
      const { gender, country, coins } = req.body;
      
      const { data: user, error } = await supabase
        .from('users')
        .update({
          gender,
          country,
          coins,
          last_seen: new Date().toISOString()
        })
        .eq('id', req.params.id)
        .select()
        .single();
      
      if (error) throw error;
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user status
  router.put('/:id/status', async (req, res) => {
    try {
      const { isOnline } = req.body;
      
      const { data: user, error } = await supabase
        .from('users')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('id', req.params.id)
        .select()
        .single();
      
      if (error) throw error;
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}