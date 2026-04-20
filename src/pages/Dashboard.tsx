import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeSchemes: 0,
    totalPayments: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [customers, schemes, payments] = await Promise.all([
        apiService.getCustomers(),
        apiService.getSchemes(),
        apiService.getPayments()
      ]);

      setStats({
        totalCustomers: customers.length,
        activeSchemes: schemes.filter(s => s.status === 'active').length,
        totalPayments: payments.length,
        pendingPayments: payments.filter(p => p.status === 'pending').length
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Customers', value: stats.totalCustomers, color: 'blue', link: '/customers' },
    { title: 'Active Schemes', value: stats.activeSchemes, color: 'green', link: '/schemes' },
    { title: 'Total Payments', value: stats.totalPayments, color: 'yellow', link: '/payments' },
    { title: 'Pending Payments', value: stats.pendingPayments, color: 'red', link: '/payments' }
  ];

  const colorClasses = {
    blue: 'border-blue-600 text-blue-600',
    green: 'border-green-600 text-green-600',
    yellow: 'border-yellow-600 text-yellow-600',
    red: 'border-red-600 text-red-600'
  };

  return (
    <div>
      <h1 className="mb-8 text-gray-800 text-2xl md:text-3xl font-bold">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, index) => (
          <Link
            key={index}
            to={card.link}
            className="no-underline"
          >
            <div className={`
              card border-l-4 cursor-pointer transition-transform duration-200 hover:-translate-y-1 hover:shadow-md
              ${colorClasses[card.color as keyof typeof colorClasses]}
            `}>
              <h3 className="m-0 mb-2.5 text-gray-600 text-sm font-medium">
                {card.title}
              </h3>
              <p className={`m-0 text-3xl font-bold ${colorClasses[card.color as keyof typeof colorClasses].split(' ')[1]}`}>
                {card.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h2 className="mb-4 text-gray-800 text-xl font-semibold">Quick Actions</h2>
          <div className="flex flex-col gap-2.5">
            <Link 
              to="/customers/add" 
              className="btn btn-primary text-center no-underline"
            >
              Add New Customer
            </Link>
            <Link 
              to="/schemes/add" 
              className="btn btn-primary text-center no-underline"
            >
              Create New Scheme
            </Link>
            <Link 
              to="/payments" 
              className="btn btn-secondary text-center no-underline"
            >
              View Payments
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-gray-800 text-xl font-semibold">Recent Activity</h2>
          <div className="text-gray-600">
            <p className="mb-2">• Welcome to Chit Fund Admin Portal</p>
            <p className="mb-2">• Manage customers, schemes, and payments</p>
            <p className="mb-2">• Use the navigation menu to access different sections</p>
            <p>• All data is currently mocked for frontend development</p>
          </div>
        </div>
      </div>
    </div>
  );
}
