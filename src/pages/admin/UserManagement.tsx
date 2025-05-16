import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { User } from '../../types';
import { 
  Search,
  Filter,
  Ban,
  Trash2,
  Clock,
  User as UserIcon,
  Flag,
  DollarSign // ✅ yerine kullanılan ikon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CountryFlag from '../../components/CountryFlag';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    country: '',
    gender: '',
    onlineOnly: false,
    bannedOnly: false
  });
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        let query = supabase.from('users').select('*');
        
        if (filters.country) query = query.eq('country', filters.country);
        if (filters.gender) query = query.eq('gender', filters.gender);
        if (filters.onlineOnly) query = query.eq('is_online', true);
        if (filters.bannedOnly) query = query.eq('is_banned', true);
        
        const { data, error } = await query;
        if (error) throw error;
        setUsers(data || []);
        setFilteredUsers(data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
    
    const subscription = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [filters]);
  
  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [users, searchTerm]);
  
  const handleBanUser = async (userId: string) => {
    const { error } = await supabase.from('users').update({ is_banned: true }).eq('id', userId);
    if (error) console.error('Failed to ban user:', error);
  };
  
  const handleUnbanUser = async (userId: string) => {
    const { error } = await supabase.from('users').update({ is_banned: false }).eq('id', userId);
    if (error) console.error('Failed to unban user:', error);
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) console.error('Failed to delete user:', error);
    }
  };

  return (
    <AdminLayout title="User Management">
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
              placeholder="Search users by name or ID..."
              className="block w-full pl-10 pr-3 py-2 border border-dark-100 rounded-lg bg-dark-200 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filters.country}
              onChange={(e) => setFilters({ ...filters, country: e.target.value })}
              className="px-3 py-2 border border-dark-100 rounded-lg bg-dark-200 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Countries</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="JP">Japan</option>
              <option value="IN">India</option>
              <option value="BR">Brazil</option>
            </select>
            <select
              value={filters.gender}
              onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
              className="px-3 py-2 border border-dark-100 rounded-lg bg-dark-200 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <button
              onClick={() => setFilters({ ...filters, onlineOnly: !filters.onlineOnly })}
              className={`px-3 py-2 border border-dark-100 rounded-lg ${
                filters.onlineOnly ? 'bg-primary-500 text-white' : 'bg-dark-200 text-white'
              } focus:outline-none`}
            >
              Online Only
            </button>
            <button
              onClick={() => setFilters({ ...filters, bannedOnly: !filters.bannedOnly })}
              className={`px-3 py-2 border border-dark-100 rounded-lg ${
                filters.bannedOnly ? 'bg-error-500 text-white' : 'bg-dark-200 text-white'
              } focus:outline-none`}
            >
              Banned
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Country/Gender</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Coins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Seen</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-dark-300 divide-y divide-dark-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-400">No users found</td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.tr key={user.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-dark-200 flex items-center justify-center">
                            <UserIcon size={20} className="text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{user.username}</div>
                            <div className="text-sm text-gray-400">{user.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {user.country && <CountryFlag countryCode={user.country} size={16} />}
                          {user.gender && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-dark-200 text-gray-300">
                              {user.gender === 'male' ? 'Male' : user.gender === 'female' ? 'Female' : 'Other'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white flex items-center gap-1">
                          <DollarSign size={14} className="text-yellow-400" />
                          {user.coins}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user.isOnline ? 'bg-success-500/20 text-success-500' : 'bg-gray-500/20 text-gray-500'
                          }`}>
                            {user.isOnline ? 'Online' : 'Offline'}
                          </span>
                          {user.isBanned && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-error-500/20 text-error-500">
                              Banned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                           {user.lastSeen ? formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true }) : 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {user.isBanned ? (
                            <button onClick={() => handleUnbanUser(user.id)} className="text-primary-400 hover:text-primary-300" title="Unban User">
                              Unban
                            </button>
                          ) : (
                            <button onClick={() => handleBanUser(user.id)} className="text-warning-400 hover:text-warning-300" title="Ban User">
                              <Ban size={18} />
                            </button>
                          )}
                          <button onClick={() => handleDeleteUser(user.id)} className="text-error-400 hover:text-error-300" title="Delete User">
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

export default UserManagement;
