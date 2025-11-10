import React, { useState, useEffect } from 'react';
import { FiPlus, FiChevronDown, FiChevronUp, FiTrash2, FiUser, FiSave } from 'react-icons/fi';
import Modal from '../ui/Modal'; // Assuming a generic Modal component exists
import { useAuthStore } from '../../stores/authStore';

// A small form component for adding a new distribution, could be inline or in a modal.
const AddDistributionForm = ({ uniform, onAdd, onClose }) => {
    const [size, setSize] = useState('');
    const [quantity, setQuantity] = useState(1);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!size || quantity <= 0) {
            alert("Please select a size and enter a valid quantity.");
            return;
        }
        onAdd({ size, quantity: Number(quantity) });
        onClose();
    };

    const getAvailableSizes = () => {
        if (!uniform || !uniform.variants) return [];
        const allSizes = uniform.variants.flatMap(variant => 
            variant.sizes ? variant.sizes.map(s => s.size) : []
        );
        return [...new Set(allSizes)]; // Return unique sizes
    };

    const availableSizes = getAvailableSizes();

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-bold mb-4 text-white">Add Received Item: {uniform?.name}</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Size</label>
                    <select
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="w-full p-2 rounded-md bg-gray-900 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                    >
                        <option value="" disabled>Select a size</option>
                        {availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full p-2 rounded-md bg-gray-900 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                    />
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add Item</button>
            </div>
        </form>
    );
};

const UniformDistributionTable = ({ requirements, studentData, availableUniforms, initialDistribution, onDistributionChange }) => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [distributionState, setDistributionState] = useState(initialDistribution);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uniformForModal, setUniformForModal] = useState(null);
  const [currentRequirementKey, setCurrentRequirementKey] = useState(null);
  const { user, userProfile } = useAuthStore();

  useEffect(() => {
    setDistributionState(initialDistribution);
  }, [initialDistribution]);

  const updateDistribution = (newDistribution) => {
    setDistributionState(newDistribution);
    onDistributionChange(newDistribution);
  };

  const getUniformDetails = (uniformId) => availableUniforms.find(u => u.id === uniformId);

  const handleToggleRow = (index) => setExpandedRow(expandedRow === index ? null : index);

  const handleOpenAddModal = (req, key) => {
    setUniformForModal(getUniformDetails(req.uniformId));
    setCurrentRequirementKey(key);
    setIsAddModalOpen(true);
  };
  
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setUniformForModal(null);
    setCurrentRequirementKey(null);
  };

  const handleAddDistribution = (newItem) => {
    const newDistribution = { ...distributionState };
    const currentItems = newDistribution[currentRequirementKey]?.distributions || [];
    
    const issuedBy = userProfile?.displayName || userProfile?.firstName || user?.email || 'System';
    
    const itemToAdd = { 
        ...newItem, 
        receivedAt: new Date().toISOString(),
        issuedBy: issuedBy,
        issuedById: user?.uid 
    };
    
    const updatedItems = [...currentItems, itemToAdd];
    const totalReceived = updatedItems.reduce((acc, item) => acc + item.quantity, 0);

    newDistribution[currentRequirementKey] = {
      distributions: updatedItems,
      totalReceived: totalReceived,
    };
    
    updateDistribution(newDistribution);
    handleCloseAddModal();
  };

  const handleRemoveDistribution = (reqKey, itemIndex) => {
    const newDistribution = { ...distributionState };
    const currentItems = newDistribution[reqKey]?.distributions || [];
    
    currentItems.splice(itemIndex, 1);

    const totalReceived = currentItems.reduce((acc, item) => acc + item.quantity, 0);

    newDistribution[reqKey] = {
      distributions: currentItems,
      totalReceived: totalReceived,
    };

    updateDistribution(newDistribution);
  };

  const getSizesSummary = (distributions = []) => {
    if (distributions.length === 0) return '-';
    const summary = distributions
      .reduce((acc, { size, quantity }) => {
        const existing = acc.find(item => item.size === size);
        if (existing) {
          existing.quantity += quantity;
        } else {
          acc.push({ size, quantity });
        }
        return acc;
      }, [])
      .map(({size, quantity}) => `${quantity}x ${size}`)
      .join(', ');
    return summary;
  };

  if (!requirements || requirements.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-gray-400">No uniform requirements have been set up for this student's level and gender.</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Uniform</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Required</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Received</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pending</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Sizes Received</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Expand</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {requirements.map((req, index) => {
              const uniformDetails = getUniformDetails(req.uniformId);
              const key = `${studentData.gender === 'MALE' ? 'BOYS' : 'GIRLS'}-${index}`;
              const distribution = distributionState[key] || { distributions: [], totalReceived: 0 };
              const required = req.quantityPerStudent || 1;
              const received = distribution.totalReceived;
              const pending = required - received;

              return (
                <React.Fragment key={key}>
                  <tr className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{uniformDetails?.name || req.uniformId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{required}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{received}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${pending > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{pending}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {getSizesSummary(distribution.distributions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => handleOpenAddModal(req, key)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <FiPlus /> Add
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleToggleRow(index)} className="text-gray-400 hover:text-white">
                        {expandedRow === index ? <FiChevronUp /> : <FiChevronDown />}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr>
                      <td colSpan="7" className="p-0">
                        <div className="bg-gray-900/50 p-4">
                          <h4 className="font-semibold mb-2 text-white">Received Items Breakdown:</h4>
                          {distribution.distributions.length > 0 ? (
                            <ul className="space-y-2">
                              {distribution.distributions.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-center justify-between bg-gray-800 p-2 rounded-md">
                                  <div className="flex items-center gap-4">
                                    <span className="font-mono text-sm text-gray-300">Qty: <span className="font-bold text-white">{item.quantity}</span></span>
                                    <span className="font-mono text-sm text-gray-300">Size: <span className="font-bold text-white">{item.size}</span></span>
                                    <span className="font-mono text-sm text-gray-400 text-xs">({new Date(item.receivedAt).toLocaleDateString()})</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 flex items-center gap-1"><FiUser/>{item.issuedBy}</span>
                                    <button onClick={() => handleRemoveDistribution(key, itemIndex)} className="text-red-500 hover:text-red-400"><FiTrash2 /></button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500">No items received for this uniform yet.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {isAddModalOpen && uniformForModal && (
          <Modal isOpen={isAddModalOpen} onClose={handleCloseAddModal} title=" ">
              <AddDistributionForm 
                  uniform={uniformForModal}
                  onAdd={handleAddDistribution}
                  onClose={handleCloseAddModal}
              />
          </Modal>
      )}
    </>
  );
};

export default UniformDistributionTable; 