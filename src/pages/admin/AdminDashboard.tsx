import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { 
  Users, 
  Coins, 
  Video, 
  Flag,
  TrendingUp 
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  onlineUsers: number;
  totalMatches: number;
  matchesToday: number;
  totalCoinsSpent: number;
  coinsSpentToday: number;
  totalReports: number;
  reportsToday: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    onlineUsers: 0,
    totalMatches: 0,
    matchesToday: 0,
    totalCoinsSpent: 0,
    coinsSpentToday: 0,
    totalReports: 0,
    reportsToday: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const [
          { count: userCount },
          { count: onlineUserCount },
          { count: matchCount },
          { count: matchesTodayCount },
          { data: transactions },
          { data: transactionsToday },
          { count: reportCount },
          { count: reportsTodayCount }
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_online', true),
          supabase.from('matches').select('*', { count: 'exact', head: true }),
          supabase.from('matches').select('*', { count: 'exact', head: true }).gte('started_at', today.toISOString()),
          supabase.from('transactions').select('amount').eq('type', 'spend'),
          supabase.from('transactions').select('amount').eq('type', 'spend').gte('created_at', today.toISOString()),
          supabase.from('reports').select('*', { count: 'exact', head: true }),
          supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString())
        ]);
        
        const totalCoinsSpent = transactions?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
        const coinsSpentToday = transactionsToday?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
        
        setStats({
          totalUsers: userCount || 0,
          onlineUsers: onlineUserCount || 0,
          totalMatches: matchCount || 0,
          matchesToday: matchesTodayCount || 0,
          totalCoinsSpent,
          coinsSpentToday,
          totalReports: reportCount || 0,
          reportsToday: reportsTodayCount || 0
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
    
    // Subscribe to realtime updates
    const usersSubscription = supabase
      .channel('users-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users' 
      }, fetchStats)
      .subscribe();
      
    const matchesSubscription = supabase
      .channel('matches-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'matches' 
      }, fetchStats)
      .subscribe();
      
    const reportsSubscription = supabase
      .channel('reports-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports' 
      }, fetchStats)
      .subscribe();
    
    // Refresh stats every minute
    const intervalId = setInterval(fetchStats, 60000);
    
    return () => {
      clearInterval(intervalId);
      usersSubscription.unsubscribe();
      matchesSubscription.unsubscribe();
      reportsSubscription.unsubscribe();
    };
  }, []);
  
  const statsCards = [
    {
      title: 'Users',
      icon: <Users size={24} className="text-primary-500" />,
      total: stats.totalUsers,
      today: stats.onlineUsers,
      todayLabel: 'Online now',
      color: 'bg-primary-500/10',
    },
    {
      title: 'Matches',
      icon: <Video size={24} className="text-secondary-500" />,
      total: stats.totalMatches,
      today: stats.matchesToday,
      todayLabel: 'Today',
      color: 'bg-secondary-500/10',
    },
    {
      title: 'Coins Spent',
      icon: <Coins size={24} className="text-accent-500" />,
      total: stats.totalCoinsSpent,
      today: stats.coinsSpentToday,
      todayLabel: 'Today',
      color: 'bg-accent-500/10',
    },
    {
      title: 'Reports',
      icon: <Flag size={24} className="text-error-500" />,
      total: stats.totalReports,
      today: stats.reportsToday,
      todayLabel: 'Today',
      color: 'bg-error-500/10',
    },
  ];
  
  return (
    <AdminLayout title="Dashboard">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${card.color} rounded-xl p-6 border border-dark-200`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{card.title}</p>
                    <h3 className="text-2xl font-bold text-white mt-1">
                      {card.title === 'Coins Spent' ? card.total.toLocaleString() : card.total}
                    </h3>
                  </div>
                  <div className="p-3 rounded-lg bg-dark-300/50">
                    {card.icon}
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-dark-200 flex items-center gap-2">
                  <TrendingUp size={16} className="text-success-500" />
                  <span className="text-white font-medium">
                    {card.title === 'Coins Spent' ? card.today.toLocaleString() : card.today}
                  </span>
                  <span className="text-gray-400 text-sm">{card.todayLabel}</span>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-dark-300 rounded-xl p-6 border border-dark-200">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-dark-200 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary-500/20 text-primary-500">
                    <Users size={16} />
                  </div>
                  <div className="text-sm">
                    <p className="text-white">New user registered</p>
                    <p className="text-gray-400">3 minutes ago</p>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-dark-200 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-secondary-500/20 text-secondary-500">
                    <Video size={16} />
                  </div>
                  <div className="text-sm">
                    <p className="text-white">New match created</p>
                    <p className="text-gray-400">12 minutes ago</p>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-dark-200 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-error-500/20 text-error-500">
                    <Flag size={16} />
                  </div>
                  <div className="text-sm">
                    <p className="text-white">User reported for inappropriate content</p>
                    <p className="text-gray-400">25 minutes ago</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-dark-300 rounded-xl p-6 border border-dark-200">
              <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400 text-sm">Server Health</span>
                    <span className="text-success-500 text-sm font-medium">Healthy</span>
                  </div>
                  <div className="w-full bg-dark-200 rounded-full h-2">
                    <div className="bg-success-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400 text-sm">WebRTC Connections</span>
                    <span className="text-primary-500 text-sm font-medium">52 active</span>
                  </div>
                  <div className="w-full bg-dark-200 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400 text-sm">Database Load</span>
                    <span className="text-warning-500 text-sm font-medium">Moderate</span>
                  </div>
                  <div className="w-full bg-dark-200 rounded-full h-2">
                    <div className="bg-warning-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;