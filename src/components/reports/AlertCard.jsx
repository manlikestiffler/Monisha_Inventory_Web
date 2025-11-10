import { motion } from 'framer-motion';

const AlertCard = ({ alert }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${getStatusColor(alert.status)}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{alert.type}</span>
        <span className="text-2xl font-bold">{alert.count}</span>
      </div>
    </motion.div>
  );
};

export default AlertCard; 