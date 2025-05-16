import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin as supabase } from '../lib/supabaseAdmin.js';

export default function reportRoutes() {
  const router = express.Router();

  // Get all reports
  router.get('/', async (req, res) => {
    try {
      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a report
  router.post('/', async (req, res) => {
    try {
      const { reporterId, reportedId, matchId, reason } = req.body;
      
      const { data: report, error } = await supabase
        .from('reports')
        .insert({
          id: uuidv4(),
          reporter_id: reporterId,
          reported_id: reportedId,
          match_id: matchId,
          reason,
          resolved: false
        })
        .select()
        .single();
      
      if (error) throw error;
      res.status(201).json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Mark report as resolved
  router.put('/:id/resolve', async (req, res) => {
    try {
      const { data: report, error } = await supabase
        .from('reports')
        .update({ resolved: true })
        .eq('id', req.params.id)
        .select()
        .single();
      
      if (error) throw error;
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}