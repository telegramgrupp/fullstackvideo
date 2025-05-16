import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  reason: string;
  status: string;
  created_at: string;
}

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch transactions:', error.message);
      } else {
        setTransactions(data || []);
      }

      setLoading(false);
    };

    fetchTransactions();
  }, []);

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h1>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No transactions found</td>
                    </tr>
                  ) : (
                    transactions.map(txn => (
                      <tr key={txn.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{txn.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{txn.user_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{txn.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${txn.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{txn.status}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {format(new Date(txn.created_at), 'PPPp')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default TransactionHistory;
