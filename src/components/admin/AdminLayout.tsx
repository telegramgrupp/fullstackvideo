import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Coins, 
  Flag, 
  LogOut,
  VideoIcon
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { logout } = useAuth();
  const location = useLocation();
  
  const menuItems = [
    { path: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/admin/users', icon: <Users size={20} />, label: 'Users' },
    { path: '/admin/matches', icon: <MessageSquare size={20} />, label: 'Matches' },
    { path: '/admin/transactions', icon: <Coins size={20} />, label: 'Transactions' },
    { path: '/admin/reports', icon: <Flag size={20} />, label: 'Reports' },
  ];
  
  return (
    <div className="min-h-screen bg-dark-300 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-400 border-r border-dark-200 flex flex-col">
        <div className="p-4 border-b border-dark-200">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-white">
            <VideoIcon size={24} className="text-primary-500" />
            <span className="text-lg font-bold">MonkeyChat</span>
          </Link>
        </div>
        
        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                    location.pathname === item.path
                      ? 'bg-primary-500/10 text-primary-500'
                      : 'text-gray-400 hover:text-white hover:bg-dark-300 transition-colors'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-dark-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-dark-300 transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1">
        <header className="bg-dark-300 border-b border-dark-200 py-4 px-6">
          <h1 className="text-xl font-semibold text-white">{title}</h1>
        </header>
        
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;