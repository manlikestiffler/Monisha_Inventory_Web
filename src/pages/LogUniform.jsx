import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiPackage, FiUser, FiCalendar, FiSave, FiRotateCcw, FiCheck } from 'react-icons/fi';
import { useSchoolStore } from '../stores/schoolStore';
import { useInventoryStore } from '../stores/inventoryStore';
import toast from 'react-hot-toast';

const LogUniform = () => {
  const { schoolId, studentId, uniformId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get uniform and student data from location state or fetch
  const [student, setStudent] = useState(location.state?.student || null);
  const [uniform, setUniform] = useState(location.state?.uniform || null);
  const [school, setSchool] = useState(null);
  
  const [quantityReceived, setQuantityReceived] = useState(1);
  const [sizeReceived, setSizeReceived] = useState('');
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
  const [sizeNotAvailable, setSizeNotAvailable] = useState(false);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sizesLoading, setSizesLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const { updateStudentUniformLog, getStudentById, getSchoolById } = useSchoolStore();
  const { uniformVariants, fetchProducts, checkProductStock, deductProductInventory } = useInventoryStore();

  useEffect(() => {
    const loadData = async () => {
      if (!student || !uniform) {
        setDataLoading(true);
        try {
          const [studentData, schoolData] = await Promise.all([
            getStudentById(studentId),
            getSchoolById(schoolId)
          ]);
          
          setStudent(studentData);
          setSchool(schoolData);
          
          // Find uniform from school policies
          const uniformPolicy = schoolData.uniformPolicy?.find(p => p.uniformId === uniformId);
          if (uniformPolicy) {
            setUniform(uniformPolicy);
          }
        } catch (error) {
          console.error('Error loading data:', error);
          toast.error('Failed to load data');
        }
      } else {
        setStudent(student);
        setUniform(uniform);
      }
      
      // Load available sizes
      await loadAvailableSizes();
      setDataLoading(false);
    };
    
    loadData();
  }, [studentId, schoolId, uniformId, student, uniform]);

  const loadAvailableSizes = async () => {
    if (!uniform) {
      console.log('No uniform provided for size loading');
      return;
    }
    
    console.log('=== SIZE LOADING DEBUG ===');
    console.log('Uniform object:', uniform);
    console.log('Looking for uniform with ID:', uniform.uniformId);
    
    setSizesLoading(true);
    try {
      // Ensure inventory data is loaded
      await fetchProducts();
      
      console.log('All uniformVariants:', uniformVariants);
      console.log('uniformVariants length:', uniformVariants?.length || 0);
      
      // Get variants for this uniform
      const variants = (uniformVariants || []).filter(variant => 
        variant.uniformId === uniform.uniformId
      );
      
      console.log('Found variants for uniform:', variants);
      console.log('Variants count:', variants.length);
      
      // Extract sizes from variants that have stock
      const availableSizesSet = new Set();
      
      variants.forEach((variant, index) => {
        console.log(`Processing variant ${index}:`, variant);
        console.log('Variant has sizes?', variant.sizes);
        console.log('Is sizes an array?', Array.isArray(variant.sizes));
        
        if (variant.sizes && Array.isArray(variant.sizes)) {
          console.log('Sizes array length:', variant.sizes.length);
          variant.sizes.forEach((sizeObj, sizeIndex) => {
            console.log(`Size object ${sizeIndex}:`, sizeObj);
            console.log('Size obj quantity (raw):', sizeObj.quantity);
            console.log('Size obj quantity type:', typeof sizeObj.quantity);
            
            const quantity = parseInt(sizeObj.quantity) || 0;
            console.log('Parsed quantity:', quantity);
            console.log('Size value:', sizeObj.size);
            console.log('Quantity > 0?', quantity > 0);
            console.log('Has size?', !!sizeObj.size);
            
            if (quantity > 0 && sizeObj.size) {
              availableSizesSet.add(sizeObj.size);
              console.log('✅ Added size:', sizeObj.size, 'with quantity:', quantity);
            } else {
              console.log('❌ Skipped size:', sizeObj.size, 'quantity:', quantity);
            }
          });
        } else {
          console.log('❌ No sizes array found in variant');
        }
      });
      
      const sizes = Array.from(availableSizesSet).sort();
      console.log('Final available sizes:', sizes);
      console.log('=== END DEBUG ===');
      
      setAvailableSizes(sizes);
      
      if (sizes.length > 0) {
        setSizeReceived(sizes[0]);
      }
    } catch (error) {
      console.error('Error loading sizes:', error);
      toast.error('Failed to load available sizes');
    } finally {
      setSizesLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If size is available, check and deduct from product inventory
      if (!sizeNotAvailable && sizeReceived) {
        console.log('Checking product stock...', { uniformId: uniform.uniformId, size: sizeReceived, quantity: quantityReceived });
        
        const stockCheck = await checkProductStock(uniform.uniformId, sizeReceived, parseInt(quantityReceived));
        console.log('Stock check result:', stockCheck);
        
        if (!stockCheck.available) {
          toast.error(`Out of stock! Only ${stockCheck.currentStock} available. Please reorder from batch.`);
          setLoading(false);
          return;
        }
        
        // Deduct from product inventory
        await deductProductInventory(
          stockCheck.variantId,
          sizeReceived,
          parseInt(quantityReceived),
          student.id,
          'web-user'
        );
        
        console.log('✅ Product inventory deducted successfully');
      }
      
      const logEntry = {
        uniformId: uniform.uniformId,
        uniformName: uniform.uniformName,
        quantityReceived: parseInt(quantityReceived),
        sizeReceived: sizeNotAvailable ? null : sizeReceived,
        dateReceived: dateReceived,
        loggedAt: new Date().toISOString(),
        loggedBy: 'web-user',
        sizeNotAvailable: sizeNotAvailable
      };

      await updateStudentUniformLog(student.id, logEntry);
      
      toast.success(`Successfully logged ${quantityReceived} ${uniform.uniformName}(s) for ${student.name}`);
      
      // Navigate back with a refresh indicator and reload the school page to update table
      navigate(`/schools/${schoolId}`, { 
        state: { 
          refresh: true, 
          message: `Successfully logged uniform for ${student.name}` 
        },
        replace: true 
      });
    } catch (error) {
      console.error('Error logging uniform:', error);
      toast.error(error.message || 'Failed to log uniform. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setQuantityReceived(1);
    setSizeReceived('');
    setDateReceived(new Date().toISOString().split('T')[0]);
    setSizeNotAvailable(false);
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700">Loading uniform logging data...</div>
      </div>
    );
  }

  if (!student || !uniform) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-700">
          <h2 className="text-xl font-semibold mb-2">Data Not Found</h2>
          <p className="text-gray-500 mb-4">Unable to load student or uniform data.</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Log Uniform</h1>
            <p className="text-gray-600">Record uniform distribution</p>
          </div>
        </div>
          
        {/* Uniform & Student Info */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gray-200 p-3 rounded-lg">
              <FiPackage className="w-6 h-6 text-gray-700" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{uniform.uniformName}</h2>
              <div className="flex items-center gap-4 text-gray-600 text-sm mt-1">
                <span className="flex items-center gap-1">
                  <FiUser className="w-4 h-4" />
                  For {student.name}
                </span>
                <span>{student.level} • {student.gender} • Form {student.form}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Quantity Received */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity Received</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={quantityReceived}
                    onChange={(e) => setQuantityReceived(e.target.value)}
                    className="w-full bg-transparent text-gray-900 text-2xl font-bold text-center border-none outline-none"
                    required
                  />
                  <p className="text-gray-500 text-sm text-center mt-2">Items received</p>
                </div>
              </div>

              {/* Size Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Size Information</h3>
                
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="sizeNotAvailable"
                    checked={sizeNotAvailable}
                    onChange={(e) => setSizeNotAvailable(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="sizeNotAvailable" className="text-gray-700">
                    ⚠️ Size not available?
                  </label>
                </div>

                {!sizeNotAvailable ? (
                  <div>
                    <label className="block text-sm text-gray-600 mb-3">Size Received</label>
                    {sizesLoading ? (
                      <div className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-gray-600">Loading sizes...</span>
                      </div>
                    ) : availableSizes.length > 0 ? (
                      <select
                        value={sizeReceived}
                        onChange={(e) => setSizeReceived(e.target.value)}
                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required={!sizeNotAvailable}
                      >
                        <option value="">Select size</option>
                        {availableSizes.map(size => (
                          <option key={size} value={size}>Size {size}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center">
                        <span className="text-red-600">No sizes currently available in stock</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">No sizes currently available in stock</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Date Received */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Received</h3>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={dateReceived}
                    onChange={(e) => setDateReceived(e.target.value)}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Student:</span>
                    <span className="text-gray-900">{student.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uniform:</span>
                    <span className="text-gray-900">{uniform.uniformName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="text-gray-900">{quantityReceived} item(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span className="text-gray-900">{sizeNotAvailable ? 'Not Available' : sizeReceived || 'Not selected'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="text-gray-900">{dateReceived}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <FiRotateCcw className="w-5 h-5" />
              Reset Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <FiCheck className="w-5 h-5" />
              {loading ? 'Logging Uniform...' : 'Log Uniform Received'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogUniform;
