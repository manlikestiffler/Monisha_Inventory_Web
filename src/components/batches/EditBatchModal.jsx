import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuthStore } from '../../stores/authStore';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { FiSave } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const EditBatchModal = ({ isOpen, onClose, batch }) => {
    const { user } = useAuthStore();
    const [saving, setSaving] = useState(false);
    const [batchName, setBatchName] = useState('');
    const [type, setType] = useState('');
    const [variants, setVariants] = useState([]);

    useEffect(() => {
        if (batch) {
            setBatchName(batch.name || '');
            setType(batch.type || '');

            // Normalize items to ensure sizes are arrays
            const normalizedItems = (batch.items || []).map(item => ({
                ...item,
                sizes: Array.isArray(item.sizes)
                    ? item.sizes
                    : Object.entries(item.sizes || {}).map(([size, quantity]) => ({ size, quantity }))
            }));

            setVariants(normalizedItems);
        }
    }, [batch]);

    const handleUpdateBatch = async (e) => {
        e.preventDefault();
        if (!batch) return;

        try {
            setSaving(true);
            const batchRef = doc(db, 'batchInventory', batch.id);

            await updateDoc(batchRef, {
                name: batchName,
                type,
                items: variants,
                updatedAt: new Date(),
                updatedBy: user.uid
            });

            toast.success('Batch updated successfully');
            onClose();
        } catch (err) {
            console.error('Error updating batch:', err);
            toast.error('Failed to update batch');
        } finally {
            setSaving(false);
        }
    };

    const handleVariantChange = (index, field, value) => {
        const updatedVariants = [...variants];
        updatedVariants[index] = {
            ...updatedVariants[index],
            [field]: value
        };
        setVariants(updatedVariants);
    };

    const handleAddSize = (variantIndex) => {
        const updatedVariants = [...variants];
        const currentVariant = updatedVariants[variantIndex];

        // Ensure sizes is an array
        if (!Array.isArray(currentVariant.sizes)) {
            const sizesArray = Object.entries(currentVariant.sizes || {}).map(([size, quantity]) => ({
                size,
                quantity
            }));
            currentVariant.sizes = sizesArray;
        }

        currentVariant.sizes.push({ size: '', quantity: 0 });
        setVariants(updatedVariants);
    };

    const handleRemoveSize = (variantIndex, sizeIndex) => {
        const updatedVariants = [...variants];
        const currentVariant = updatedVariants[variantIndex];

        if (Array.isArray(currentVariant.sizes)) {
            currentVariant.sizes.splice(sizeIndex, 1);
            setVariants(updatedVariants);
        }
    };

    const handleSizeUpdate = (variantIndex, sizeIndex, field, value) => {
        const updatedVariants = [...variants];
        const currentVariant = updatedVariants[variantIndex];

        if (Array.isArray(currentVariant.sizes)) {
            currentVariant.sizes[sizeIndex][field] = field === 'quantity' ? (parseInt(value) || 0) : value;
            setVariants(updatedVariants);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Batch"
            size="xl"
        >
            <form onSubmit={handleUpdateBatch} className="space-y-6">
                {/* Batch Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Batch Name
                        </label>
                        <input
                            type="text"
                            value={batchName}
                            onChange={(e) => setBatchName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Type
                        </label>
                        <input
                            type="text"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-0 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                            required
                        />
                    </div>
                </div>

                {/* Variants */}
                <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Variants</h3>
                    {variants.map((variant, index) => (
                        <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl space-y-4 border border-gray-100 dark:border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Variant Name
                                    </label>
                                    <input
                                        type="text"
                                        value={variant.variantType}
                                        onChange={(e) => handleVariantChange(index, 'variantType', e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Color
                                    </label>
                                    <input
                                        type="text"
                                        value={variant.color}
                                        onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Price
                                    </label>
                                    <input
                                        type="number"
                                        value={variant.price}
                                        onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-red-500 transition-shadow text-sm text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>

                            {/* Sizes */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Sizes
                                    </label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddSize(index)}
                                        className="text-xs py-1 h-auto"
                                    >
                                        + Add Size
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {Array.isArray(variant.sizes) ? (
                                        variant.sizes.map((sizeObj, sizeIndex) => (
                                            <div key={sizeIndex} className="flex flex-col gap-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg relative group bg-white dark:bg-gray-800">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSize(index, sizeIndex)}
                                                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                    title="Remove size"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                                    </svg>
                                                </button>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                                                            Size
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={sizeObj.size}
                                                            onChange={(e) => handleSizeUpdate(index, sizeIndex, 'size', e.target.value)}
                                                            className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-red-500 text-sm"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                                                            Qty
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={sizeObj.quantity}
                                                            onChange={(e) => handleSizeUpdate(index, sizeIndex, 'quantity', e.target.value)}
                                                            className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-red-500 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={saving}
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        {saving ? (
                            <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                            <FiSave className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default EditBatchModal;
