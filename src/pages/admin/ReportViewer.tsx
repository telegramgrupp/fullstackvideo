import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { Report } from '../../types';
import { 
  Search,
  Flag,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ReportViewer: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  
  useEffect(() => {
    const fetchReports = async () => {
      try {
        let query = supabase
          .from('reports')
          .select(`
            *,
            reporter:reporter_id(username),
            reported:reported_id(username),
            match:match_id(*)
          `)
          .order('created_at', { ascending: false });
        
        if (!showResolved) {
          query = query.eq('resolved', false);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        setReports(data || []);
        setFilteredReports(data || []);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReports();
    
    // Subscribe to realtime updates
    const subscription = supabase
      .channel('reports-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports' 
      }, fetchReports)
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [showResolved]);
  
  useEffect(() => {
    // Apply search filter
    if (searchTerm) {
      const filtered = reports.filter(report => 
        report.id.includes(searchTerm) ||
        report.reporter_id.includes(searchTerm) ||
        (report.reported_id && report.reported_id.includes(searchTerm)) ||
        report.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredReports(filtered);
    } else {
      setFilteredReports(reports);
    }
  }, [reports, searchTerm]);
  
  const handleResolveReport = async (reportId: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ resolved: true })
      .eq('id', reportId);
    
    if (error) {
      console.error('Failed to resolve report:', error);
    }
  };
  
  const handleBanUser = async (userId: string) => {
    const { error } = await supabase
      .from('users')
      .update({ is_banned: true })
      .eq('id', userId);
    
    if (error) {
      console.error('Failed to ban user:', error);
    }
  };
  
  return (
    <AdminLayout title="Report Viewer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reports..."
              className="block w-full pl-10 pr-3 py-2 border border-dark-100 rounded-lg bg-dark-200 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`px-4 py-2 rounded-lg ${
              showResolved ? 'bg-primary-500 text-white' : 'bg-dark-200 text-gray-400'
            }`}
          >
            Show Resolved
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Flag size={16} className="text-warning-500" />
                      <span className="text-sm font-medium text-warning-500">
                        Report #{report.id.substring(0, 8)}
                      </span>
                      {report.resolved && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-success-500/20 text-success-500">
                          Resolved
                        </span>
                      )}
                    </div>
                    
                    <p className="text-white mb-4">{report.reason}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400 mb-1">Reporter</div>
                        <div className="flex items-center gap-2">
                          <User size={14} />
                          <span>{report.reporter?.username || report.reporter_id}</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-400 mb-1">Reported User</div>
                        <div className="flex items-center gap-2">
                          <User size={14} />
                          <span>{report.reported?.username || report.reported_id || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-400 mb-1">Match ID</div>
                        <div className="flex items-center gap-2">
                          <MessageSquare size={14} />
                          <span>{report.match_id.substring(0, 8)}...</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-400 mb-1">Reported</div>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!report.resolved && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveReport(report.id)}
                        className="p-2 rounded-lg bg-success-500/20 text-success-500 hover:bg-success-500/30"
                        title="Mark as Resolved"
                      >
                        <CheckCircle size={20} />
                      </button>
                      
                      {report.reported_id && (
                        <button
                          onClick={() => handleBanUser(report.reported_id!)}
                          className="p-2 rounded-lg bg-error-500/20 text-error-500 hover:bg-error-500/30"
                          title="Ban User"
                        >
                          <XCircle size={20} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            
            {filteredReports.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No reports found
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ReportViewer;