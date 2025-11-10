import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiPackage, FiAlertTriangle } from 'react-icons/fi';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useSchoolStore } from '../../stores/schoolStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import toast from 'react-hot-toast';

const LogUniformModal = ({ isOpen, onClose, student, uniform, onSuccess }) => {
  const [quantityReceived, setQuantityReceived] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [sizeNotAvailable, setSizeNotAvailable] = useState(false);
  const [sizeWanted, setSizeWanted] = useState('');
  const [availableSizes, setAvailableSizes] = useState([]);
  const [sizeStockInfo, setSizeStockInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { updateStudentUniformLog } = useSchoolStore();
  const { uniformVariants, uniforms, fetchProducts, checkProductStock, deductProductInventory } = useInventoryStore();

  useEffect(() => {
    if (isOpen && uniform) {
      loadAvailableSizes();
      resetForm();
    }
  }, [isOpen, uniform]);

  const resetForm = () => {
    setQuantityReceived(1);
    setSelectedSize('');
    setSizeNotAvailable(false);
    setSizeWanted('');
  };

  const loadAvailableSizes = async () => {
    if (!uniform) return;
    
    setLoading(true);
    try {
      await fetchProducts();
      
      console.log('=== SIZE LOADING DEBUG (WEB) ===');
      console.log('Uniform object:', uniform);
      console.log('Uniform ID:', uniform.uniformId);
      console.log('Uniform Name:', uniform.uniformName);
      console.log('All uniformVariants count:', uniformVariants.length);
      console.log('Sample uniformVariant:', uniformVariants[0]);
      console.log('All uniforms count:', uniforms.length);
      console.log('Sample uniform:', uniforms[0]);
      
      const availableSizesSet = new Set();
      const stockInfo = {};
      
      // Find variants for this uniform
      let variants = uniformVariants.filter(variant => 
        variant.uniformId === uniform.uniformId
      );
      console.log('Variants found by uniformId:', variants.length);
      
      // If no variants found by uniformId, try matching by uniform name
      if (variants.length === 0) {
        console.log('No variants found by ID, trying by name...');
        const matchingUniform = uniforms.find(u => u.id === uniform.uniformId);
        console.log('Matching uniform:', matchingUniform);
        if (matchingUniform) {
          variants = uniformVariants.filter(variant => 
            variant.uniformId === matchingUniform.id
          );
          console.log('Variants found by matching uniform:', variants.length);
        }
      }
      
      // Extract sizes and track stock quantities
      variants.forEach(variant => {
        console.log('Processing variant:', variant.id);
        console.log('Variant color:', variant.color);
        console.log('Variant sizes:', variant.sizes);
        
        if (variant.sizes && Array.isArray(variant.sizes)) {
          variant.sizes.forEach((sizeObj) => {
            if (sizeObj.size) {
              const quantity = parseInt(sizeObj.quantity) || 0;
              
              // Track total stock for this size
              if (!stockInfo[sizeObj.size]) {
                stockInfo[sizeObj.size] = 0;
              }
              stockInfo[sizeObj.size] += quantity;
              
              // Add all sizes regardless of stock
              availableSizesSet.add(sizeObj.size);
              
              if (quantity > 0) {
                console.log('✅ Added size with stock:', sizeObj.size, '(quantity:', quantity, ')');
              } else {
                console.log('⚠️ Added size with NO stock:', sizeObj.size, '(quantity:', quantity, ')');
              }
            }
          });
        }
      });
      
      setSizeStockInfo(stockInfo);
      console.log('Stock info by size:', stockInfo);
      
      const sizes = Array.from(availableSizesSet).sort();
      console.log('Final available sizes:', sizes);
      console.log('=== END DEBUG ===');
      
      setAvailableSizes(sizes);
      
      if (sizes.length > 0) {
        // Select first size with stock if available
        const firstSizeWithStock = sizes.find(size => stockInfo[size] > 0);
        setSelectedSize(firstSizeWithStock || sizes[0]);
      }
    } catch (error) {
      console.error('Error loading sizes:', error);
      toast.error('Failed to load available sizes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const quantity = parseInt(quantityReceived);
    if (isNaN(quantity) || quantity < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!sizeNotAvailable && !selectedSize) {
      toast.error('Please select a size or mark as unavailable');
      return;
    }

    if (sizeNotAvailable && !sizeWanted.trim()) {
      toast.error('Please enter the wanted size');
      return;
    }

    // Check stock and warn if needed
    if (!sizeNotAvailable && selectedSize) {
      const stock = sizeStockInfo[selectedSize] || 0;
      if (stock === 0) {
        const confirmed = window.confirm(
          `Size ${selectedSize} currently has no stock. Are you sure you want to log this uniform as received?`
        );
        if (!confirmed) return;
      }
    }

    saveUniformLog();
  };

  const saveUniformLog = async () => {
    setSaving(true);
    try {
      const quantity = parseInt(quantityReceived);
      
      // If size is available, check and deduct from product inventory
      if (!sizeNotAvailable && selectedSize) {
        const stockCheck = await checkProductStock(uniform.uniformId, selectedSize, quantity);
        
        if (!stockCheck.available) {
          toast.error(
            `Only ${stockCheck.currentStock} available. Please reorder from batch inventory.`,
            { duration: 5000 }
          );
          setSaving(false);
          return;
        }
        
        // Deduct from product inventory
        await deductProductInventory(
          stockCheck.variantId,
          selectedSize,
          quantity,
          student.id,
          'web-user'
        );
      }
      
      const logEntry = {
        uniformId: uniform.uniformId,
        uniformName: uniform.uniformName,
        uniformType: uniform.uniformType || 'UNIFORM',
        quantityReceived: sizeNotAvailable ? 0 : quantity,
        sizeReceived: sizeNotAvailable ? null : selectedSize,
        sizeWanted: sizeNotAvailable ? sizeWanted.trim() : null,
        loggedAt: new Date().toISOString(),
        loggedBy: 'web-user'
      };

      await updateStudentUniformLog(student.id, logEntry);
      
      toast.success(
        sizeNotAvailable ? 
          `Size request for ${sizeWanted} has been logged` :
          `Successfully logged ${quantity} ${uniform.uniformName}(s), Size ${selectedSize}`
      );
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving uniform log:', error);
      toast.error(error.message || 'Failed to save uniform log entry');
    } finally {
      setSaving(false);
    }
  };


  if (!uniform || !student) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log Uniform - ${uniform.uniformName}`}>
      <div className="p-6 space-y-6 bg-background max-w-md mx-auto">
        {/* Header Info */}
        <div className="bg-primary text-primary-foreground p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <FiPackage className="w-6 h-6" />
            <div>
              <h3 className="font-semibold text-lg">{uniform.uniformName}</h3>
              <p className="text-primary-foreground/80 text-sm">For {student.name}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quantity Received */}
          <div className="bg-card border border-border p-4 rounded-lg">
            <label className="block text-sm font-medium text-foreground mb-3">
              Quantity Received
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={quantityReceived}
              onChange={(e) => setQuantityReceived(e.target.value)}
              disabled={sizeNotAvailable}
              className="w-full bg-muted text-foreground text-lg font-medium text-center border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
              required
            />
            {sizeNotAvailable && (
              <p className="text-xs text-muted-foreground mt-2">
                Quantity set to 0 when size is not available
              </p>
            )}
          </div>

          {/* Size Information */}
          <div className="bg-card border border-border p-4 rounded-lg">
            <label className="block text-sm font-medium text-foreground mb-3">
              Size Information
            </label>
            
            {/* Size Not Available Toggle */}
            <label className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
              <input
                type="checkbox"
                checked={sizeNotAvailable}
                onChange={(e) => setSizeNotAvailable(e.target.checked)}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
              />
              <FiAlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-foreground">
                Size not available?
              </span>
            </label>

            {!sizeNotAvailable ? (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Size Received</label>
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Loading available sizes...
                    </p>
                  </div>
                ) : availableSizes.length > 0 ? (
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full bg-muted text-foreground border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                    required={!sizeNotAvailable}
                  >
                    {availableSizes.map(size => {
                      const stock = sizeStockInfo[size] || 0;
                      const stockLabel = stock > 0 ? `(${stock} in stock)` : '(OUT OF STOCK)';
                      return (
                        <option 
                          key={size} 
                          value={size}
                          className={stock > 0 ? '' : 'text-destructive'}
                        >
                          Size {size} {stockLabel}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-destructive text-sm text-center">
                      No sizes currently available in stock
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Size Wanted</label>
                <input
                  type="text"
                  value={sizeWanted}
                  onChange={(e) => setSizeWanted(e.target.value)}
                  placeholder="Enter the size the student needs"
                  className="w-full bg-muted text-foreground border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  required={sizeNotAvailable}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This will be logged as a size request for future fulfillment
                </p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <h4 className="text-primary font-medium mb-2">Summary</h4>
            <p className="text-foreground text-sm">
              {sizeNotAvailable ? 
                `Logging a size request for "${sizeWanted}" - no items will be marked as received.` :
                `Logging ${quantityReceived} ${uniform.uniformName}(s) in size ${selectedSize} for ${student.name}.`
              }
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={saving || loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiCheck className="w-4 h-4" />
                  {sizeNotAvailable ? 'Log Size Request' : 'Log Uniform Received'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default LogUniformModal;
