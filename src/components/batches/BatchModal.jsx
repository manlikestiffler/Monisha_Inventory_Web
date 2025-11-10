import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useSchoolStore } from '../../stores/schoolStore';
import { useBatchStore } from '../../stores/batchStore';
import { useAuthStore } from '../../stores/authStore';

const BatchModal = ({ open, onClose, initialData = null, isGeneralBatch = false }) => {
  const { products, fetchProducts } = useInventoryStore();
  const { schools, fetchSchools } = useSchoolStore();
  const addBatch = useBatchStore((state) => state.addBatch);

  const [formData, setFormData] = useState(initialData || {
    name: '',
    type: isGeneralBatch ? 'general' : 'school',
    items: [],
    status: 'pending',
    startDate: '',
    expectedEndDate: '',
    assignedTo: '',
    schoolId: '',
    productionCost: 0,
    laborCost: 0,
    notes: ''
  });

  const [selectedUniform, setSelectedUniform] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  useEffect(() => {
    fetchProducts();
    if (!isGeneralBatch) {
      fetchSchools();
    }
  }, [fetchProducts, fetchSchools, isGeneralBatch]);

  // Reset form when modal opens with initialData
  useEffect(() => {
    if (open && initialData) {
      setFormData(initialData);
    } else if (!open) {
      setFormData({
        name: '',
        type: isGeneralBatch ? 'general' : 'school',
        items: [],
        status: 'pending',
        startDate: '',
        expectedEndDate: '',
        assignedTo: '',
        schoolId: '',
        productionCost: 0,
        laborCost: 0,
        notes: ''
      });
    }
  }, [open, initialData, isGeneralBatch]);

  const handleAddItem = () => {
    if (!selectedUniform || !selectedVariant || quantity <= 0) return;

    const newItem = {
      uniformId: selectedUniform.id,
      uniformName: selectedUniform.name,
      variantId: selectedVariant.id,
      variantDetails: `${selectedVariant.size} - ${selectedVariant.color}`,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      completedQuantity: 0
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      productionCost: prev.productionCost + newItem.totalPrice
    }));

    // Reset selection
    setSelectedUniform(null);
    setSelectedVariant(null);
    setQuantity(1);
    setUnitPrice(0);
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => {
      const removedItem = prev.items[index];
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
        productionCost: prev.productionCost - removedItem.totalPrice
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { user, userProfile } = useAuthStore.getState();
      
      console.log('🔍 DEBUG - Raw user object:', user);
      console.log('🔍 DEBUG - Raw userProfile object:', userProfile);
      
      // Try multiple ways to get the full name
      let fullName = 'Unknown User';
      
      // Method 1: firstName + lastName from userProfile
      if (userProfile?.firstName && userProfile?.lastName) {
        fullName = `${userProfile.firstName} ${userProfile.lastName}`.trim();
        console.log('✅ Using firstName + lastName:', fullName);
      }
      // Method 2: displayName from userProfile
      else if (userProfile?.displayName) {
        fullName = userProfile.displayName;
        console.log('✅ Using userProfile.displayName:', fullName);
      }
      // Method 3: displayName from user (Firebase Auth)
      else if (user?.displayName) {
        fullName = user.displayName;
        console.log('✅ Using user.displayName:', fullName);
      }
      // Method 4: email as fallback
      else if (user?.email) {
        fullName = user.email.split('@')[0];
        console.log('⚠️ Using email as fallback:', fullName);
      }
      
      const userInfo = {
        id: user?.uid,
        name: fullName,
        fullName: fullName,
        email: user?.email
      };
      
      console.log('📦 Batch creation - Final userInfo:', userInfo);
      
      await addBatch(formData, userInfo);
      onClose();
    } catch (error) {
      console.error('Error saving batch:', error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? 'Edit Batch' : (isGeneralBatch ? 'Add General Batch' : 'Add School Batch')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Batch Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'distributed', label: 'Distributed' }
            ]}
            required
          />
          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            required
          />
          <Input
            label="Expected Completion Date"
            type="date"
            value={formData.expectedEndDate}
            onChange={(e) => setFormData(prev => ({ ...prev, expectedEndDate: e.target.value }))}
            required
          />
          {!isGeneralBatch && (
            <Select
              label="Assign to School (Optional)"
              value={formData.schoolId}
              onChange={(e) => setFormData(prev => ({ ...prev, schoolId: e.target.value }))}
              options={[
                { value: '', label: 'Select School' },
                ...schools.map(school => ({
                  value: String(school.id),
                  label: school.name
                }))
              ]}
            />
          )}
          <Input
            label="Assigned To"
            value={formData.assignedTo}
            onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
            placeholder="Enter employee name"
          />
          <Input
            label="Labor Cost (₹)"
            type="number"
            value={formData.laborCost}
            onChange={(e) => setFormData(prev => ({ ...prev, laborCost: parseFloat(e.target.value) }))}
            required
          />
        </div>

        {/* Add Items Section */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Add Uniform Items</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              value={selectedUniform?.id || ''}
              onChange={(e) => {
                const uniform = products?.find(u => u.id === e.target.value);
                setSelectedUniform(uniform);
                setSelectedVariant(null);
              }}
              options={[
                { value: '', label: 'Select Uniform Type' },
                ...(products || []).map(uniform => ({
                  value: String(uniform.id),
                  label: uniform.name
                }))
              ]}
              placeholder="Select Uniform Type"
            />
            <Select
              value={selectedVariant?.id || ''}
              onChange={(e) => {
                const variant = selectedUniform?.variants?.find(v => v.id === e.target.value);
                setSelectedVariant(variant);
              }}
              options={[
                { value: '', label: 'Select Variant' },
                ...(selectedUniform?.variants || []).map(variant => ({
                  value: String(variant.id),
                  label: `${variant.size} - ${variant.color}`
                }))
              ]}
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
            <Input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value))}
              placeholder="Unit Price (₹)"
            />
            <Button
              type="button"
              onClick={handleAddItem}
              disabled={!selectedUniform || !selectedVariant || quantity <= 0 || unitPrice <= 0}
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
              <div className="flex-1 grid grid-cols-4 gap-4">
                <div>
                  <p className="font-medium text-gray-900">{item.uniformName}</p>
                  <p className="text-sm text-gray-500">{item.variantDetails}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Quantity</p>
                  <p className="font-medium">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unit Price</p>
                  <p className="font-medium">₹{item.unitPrice}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="font-medium">₹{item.totalPrice}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="ml-4 text-red-600 hover:text-red-700"
              >
                ×
              </button>
            </motion.div>
          ))}
          {formData.items.length > 0 && (
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Production Cost</p>
                <p className="text-lg font-bold">₹{formData.productionCost}</p>
              </div>
            </div>
          )}
        </div>

        <Input
          label="Notes"
          as="textarea"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Add any additional notes..."
        />

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={formData.items.length === 0}>
            {initialData ? 'Update Batch' : 'Create Batch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default BatchModal; 