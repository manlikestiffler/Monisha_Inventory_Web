import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import TransactionModal from '../components/transactions/TransactionModal';
import { useTransactionStore } from '../stores/transactionStore';
import { useSchoolStore } from '../stores/schoolStore';

const TransactionCard = ({ transaction, onView }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg p-4 shadow-soft hover:shadow-hover transition-all duration-300"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">Order #{transaction.id}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(transaction.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={getStatusColor(transaction.status)}>
          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Items:</span>
          <span className="font-medium">{transaction.items.length}</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-1">
          <span className="text-gray-500">Total Amount:</span>
          <span className="font-medium">₹{transaction.totalAmount}</span>
        </div>
        {transaction.paymentMethod && (
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-gray-500">Payment Method:</span>
            <span className="font-medium">
              {transaction.paymentMethod.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="sm" onClick={() => onView(transaction)}>
          View Details
        </Button>
      </div>
    </motion.div>
  );
};

const Transactions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const { transactions, loading, fetchTransactions } = useTransactionStore();
  const { schools, fetchSchools } = useSchoolStore();

  useEffect(() => {
    fetchTransactions();
    fetchSchools();
  }, [fetchTransactions, fetchSchools]);

  const handleView = (transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesSchool = schoolFilter === 'all' || transaction.schoolId === schoolFilter;
    
    // Date filtering
    if (dateRange !== 'all') {
      const date = new Date(transaction.createdAt);
      const now = new Date();
      const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
      
      switch (dateRange) {
        case 'today':
          return daysDiff < 1;
        case 'week':
          return daysDiff <= 7;
        case 'month':
          return daysDiff <= 30;
        default:
          return true;
      }
    }

    return matchesSearch && matchesStatus && matchesSchool;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all transactions
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Transaction
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'paid', label: 'Paid' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
          />
          <Select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Schools' },
              ...schools.map(school => ({
                value: school.id,
                label: school.name
              }))
            ]}
          />
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' }
            ]}
          />
        </div>
      </Card>

      {/* Transactions List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onView={handleView}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedTransaction(null);
        }}
        initialData={selectedTransaction}
      />
    </div>
  );
};

export default Transactions; 