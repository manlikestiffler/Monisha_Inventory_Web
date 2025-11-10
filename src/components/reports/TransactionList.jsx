import { motion } from 'framer-motion';

const TransactionList = ({ transactions }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {transactions.map((transaction, index) => (
        <motion.div
          key={transaction.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
        >
          <div>
            <p className="font-medium text-gray-900">{transaction.school}</p>
            <p className="text-sm text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">₹{transaction.amount.toLocaleString()}</p>
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default TransactionList; 