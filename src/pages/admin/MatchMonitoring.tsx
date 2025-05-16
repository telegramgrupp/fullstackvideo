import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import VideoPlayer from '../../components/admin/VideoPlayer';
import { supabase } from '../../lib/supabaseClient';
import { Match } from '../../types';
import { 
  Search,
  Calendar,
  Clock,
  SkipForward,
  Trash2,
  Flag,
  Video,
  Users,
  Play
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const MatchMonitoring: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filters, setFilters] = useState({
    dateRange: 'today',
    onlyFake: false,
    onlyActive: false,
    onlyRecorded: false
  });
  
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        let query = supabase.from('matches').select('*');
        
        if (filters.dateRange !== 'all') {
          const now = new Date();
          let cutoffDate = new Date();
          
          if (filters.dateRange === 'today') {
            cutoffDate.setHours(0, 0, 0, 0);
          } else if (filters.dateRange === 'week') {
            cutoffDate.setDate(now.getDate() - 7);
          } else if (filters.dateRange === 'month') {
            cutoffDate.setMonth(now.getMonth() - 1);
          }
          
          query = query.gte('started_at', cutoffDate.toISOString());
        }
        
        if (filters.onlyFake) {
          query = query.eq('is_fake', true);
        }
        
        if (filters.onlyActive) {
          query = query.is('ended_at', null);
        }

        if (filters.onlyRecorded) {
          query = query.not('video_url', 'is', null);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        setMatches(data || []);
        setFilteredMatches(data || []);
      } catch (error) {
        console.error('Failed to fetch matches:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMatches();
    
    const subscription = supabase
      .channel('matches-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'matches' 
      }, fetchMatches)
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [filters]);
  
  useEffect(() => {
    if (searchTerm) {
      const filtered = matches.filter(match => 
        match.id.includes(searchTerm) ||
        (match.peer_a && match.peer_a.includes(searchTerm)) ||
        (match.peer_b && match.peer_b.includes(searchTerm))
      );
      setFilteredMatches(filtered);
    } else {
      setFilteredMatches(matches);
    }
  }, [matches, searchTerm]);
  
  const handleEndMatch = async (matchId: string) => {
    const now = new Date();
    const { data: match } = await supabase
      .from('matches')
      .select('started_at')
      .eq('id', matchId)
      .single();
    
    if (match) {
      const duration = Math.floor((now.getTime() - new Date(match.started_at).getTime()) / 1000);
      
      const { error } = await supabase
        .from('matches')
        .update({
          ended_at: now.toISOString(),
          duration
        })
        .eq('id', matchId);
      
      if (error) {
        console.error('Failed to end match:', error);
      }
    }
  };
  
  const handleFlagMatch = async (matchId: string) => {
    alert(`Match ${matchId} has been flagged for review.`);
  };
  
  const handleDeleteMatch = async (matchId: string) => {
    if (confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);
      
      if (error) {
        console.error('Failed to delete match:', error);
      }
    }
  };

  const handleViewRecording = (match: Match) => {
    setSelectedMatch(match);
  };
  
  return (
    <AdminLayout title="Match Monitoring">
      {selectedMatch && selectedMatch.video_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl">
            <VideoPlayer 
              src={selectedMatch.video_url} 
              title={`Match Recording - ${selectedMatch.id}`} 
            />
            <button
              onClick={() => setSelectedMatch(null)}
              className="mt-4 px-4 py-2 bg-dark-200 rounded-lg hover:bg-dark-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="bg-dark-300 rounded-xl border border-dark-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-dark-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by match ID or user ID..."
              className="block w-full pl-10 pr-3 py-2 border border-dark-100 rounded-lg bg-dark-200 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-3">
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="px-3 py-2 border border-dark-100 rounded-lg bg-dark-200 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
            
            <button
              onClick={() => setFilters({ ...filters, onlyFake: !filters.onlyFake })}
              className={`px-3 py-2 border border-dark-100 rounded-lg ${
                filters.onlyFake ? 'bg-warning-500 text-white' : 'bg-dark-200 text-white'
              } focus:outline-none`}
            >
              Fake Matches
            </button>
            
            <button
              onClick={() => setFilters({ ...filters, onlyActive: !filters.onlyActive })}
              className={`px-3 py-2 border border-dark-100 rounded-lg ${
                filters.onlyActive ? 'bg-success-500 text-white' : 'bg-dark-200 text-white'
              } focus:outline-none`}
            >
              Active Now
            </button>

            <button
              onClick={() => setFilters({ ...filters, onlyRecorded: !filters.onlyRecorded })}
              className={`px-3 py-2 border border-dark-100 rounded-lg ${
                filters.onlyRecorded ? 'bg-primary-500 text-white' : 'bg-dark-200 text-white'
              } focus:outline-none`}
            >
              With Recording
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-200">
              <thead className="bg-dark-400">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Match ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Users
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Started At
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-dark-300 divide-y divide-dark-200">
                {filteredMatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      No matches found
                    </td>
                  </tr>
                ) : (
                  filteredMatches.map((match, index) => (
                    <motion.tr
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{match.id.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-white">
                          <Users size={16} />
                          <span>{match.peer_a.substring(0, 6)}... ↔ {match.peer_b ? match.peer_b.substring(0, 6) + '...' : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          match.is_fake ? 'bg-warning-500/20 text-warning-500' : 'bg-success-500/20 text-success-500'
                        }`}>
                          {match.is_fake ? 'Fake' : 'Real'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Calendar size={14} />
                          <span>{format(new Date(match.started_at), 'MMM d, yy')}</span>
                          <span className="text-gray-500">•</span>
                          <span>{format(new Date(match.started_at), 'HH:mm')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {match.duration ? `${match.duration} seconds` : 'In progress'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            match.ended_at ? 'bg-gray-500/20 text-gray-500' : 'bg-success-500/20 text-success-500'
                          }`}>
                            {match.ended_at ? 'Ended' : 'Active'}
                          </span>
                          {match.video_url && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-500/20 text-primary-500">
                              Recorded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {match.video_url && (
                            <button
                              onClick={() => handleViewRecording(match)}
                              className="text-primary-400 hover:text-primary-300"
                              title="View Recording"
                            >
                              <Play size={18} />
                            </button>
                          )}
                          
                          {!match.ended_at && (
                            <button
                              onClick={() => handleEndMatch(match.id)}
                              className="text-warning-400 hover:text-warning-300"
                              title="End Match"
                            >
                              <SkipForward size={18} />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleFlagMatch(match.id)}
                            className="text-accent-400 hover:text-accent-300"
                            title="Flag Match"
                          >
                            <Flag size={18} />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            className="text-error-400 hover:text-error-300"
                            title="Delete Match"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default MatchMonitoring;