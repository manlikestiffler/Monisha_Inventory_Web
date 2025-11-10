import { motion } from 'framer-motion';
import Button from '../ui/Button';

const RecentOrders = ({ orders }) => {
  const getStatusStyles = (status) => {
    const styles = {
      completed: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        icon: 'bg-green-500',
        progress: 'w-full'
      },
      processing: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        icon: 'bg-blue-500',
        progress: 'w-2/3'
      },
      pending: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        icon: 'bg-yellow-500',
        progress: 'w-1/3'
      }
    };
    return styles[status];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            <p className="text-sm text-gray-500">Latest uniform orders and their status</p>
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <span>View All Orders</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {orders.map((order, index) => {
          const statusStyle = getStatusStyles(order.status);
          
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${statusStyle.bg}`}>
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{order.school}</h3>
                    <p className="text-sm text-gray-500">Order #{order.id} • {order.items} items</p>
                  </div>
                </div>

                <div className="flex-1 w-full sm:w-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${statusStyle.text}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500">{order.date}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${statusStyle.icon} transition-all duration-500`}
                      style={{ width: statusStyle.progress }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(order.amount)}
                  </span>
                  <Button variant="text" className="text-gray-500 hover:text-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentOrders; 