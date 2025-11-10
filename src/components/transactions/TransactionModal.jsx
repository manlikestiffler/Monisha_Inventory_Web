import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useSchoolStore } from '../../stores/schoolStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useTransactionStore } from '../../stores/transactionStore';

const TransactionModal = ({ isOpen, onClose, initialData = null }) => {
  const { schools, fetchSchools } = useSchoolStore();
  const { uniforms, fetchUniforms } = useInventoryStore();
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const [formData, setFormData] = useState(initialData || {
    schoolId: '',
    items: [],
    totalAmount: 0,
    status: 'pending',
    paymentMethod: '',
    notes: ''
  });

  const [selectedUniform, setSelectedUniform] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchSchools();
    fetchUniforms();
  }, [fetchSchools, fetchUniforms]);

  const handleAddItem = () => {
    if (!selectedUniform || !selectedVariant || quantity <= 0) return;

    const newItem = {
      uniformId: selectedUniform.id,
      variantId: selectedVariant.id,
      quantity,
      price: selectedUniform.price,
      total: selectedUniform.price * quantity
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      totalAmount: prev.totalAmount + newItem.total
    }));

    // Reset selection
    setSelectedUniform(null);
    setSelectedVariant(null);
    setQuantity(1);
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
      totalAmount: prev.totalAmount - prev.items[index].total
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addTransaction(formData);
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Transaction' : 'New Transaction'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="School"
            value={formData.schoolId}
            onChange={(e) => setFormData(prev => ({ ...prev, schoolId: e.target.value }))}
            options={schools.map(school => ({
              value: school.id,
              label: school.name
            }))}
            required
          />
          <Select
            label="Payment Method"
            value={formData.paymentMethod}
            onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'cheque', label: 'Cheque' }
            ]}
            required
          />
        </div>

        {/* Add Items Section */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Add Items</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={selectedUniform?.id || ''}
              onChange={(e) => {
                const uniform = uniforms.find(u => u.id === e.target.value);
                setSelectedUniform(uniform);
                setSelectedVariant(null);
              }}
              options={uniforms.map(uniform => ({
                value: uniform.id,
                label: uniform.name
              }))}
              placeholder="Select Uniform"
            />
            <Select
              value={selectedVariant?.id || ''}
              onChange={(e) => {
                const variant = selectedUniform?.variants.find(v => v.id === e.target.value);
                setSelectedVariant(variant);
              }}
              options={selectedUniform?.variants.map(variant => ({
                value: variant.id,
                label: `${variant.size} - ${variant.color}`
              })) || []}
              placeholder="Select Variant"
              disabled={!selectedUniform}
            />
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              placeholder="Quantity"
            />
            <Button
              type="button"
              onClick={handleAddItem}
              disabled={!selectedUniform || !selectedVariant || quantity <= 0}
            >
              Add Item
            </Button>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-2">
          {formData.items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {uniforms.find(u => u.id === item.uniformId)?.name}
                </p>
                <p className="text-sm text-gray-500">
                  Quantity: {item.quantity} × ₹{item.price}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <p className="font-medium">₹{item.total}</p>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div>
            <Input
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
            />
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">₹{formData.totalAmount}</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={formData.items.length === 0}>
            {initialData ? 'Update Transaction' : 'Create Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TransactionModal; 