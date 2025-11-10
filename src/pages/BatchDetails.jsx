import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../stores/authStore';
import { FiArrowLeft, FiPackage, FiEdit, FiBox, FiDollarSign, FiUser, FiCalendar } from 'react-icons/fi';
import Button from '../components/ui/Button';
import LoadingScreen from '../components/ui/LoadingScreen';

function BatchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isManager } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batch, setBatch] = useState(null);
  const [creatorFullName, setCreatorFullName] = useState('');

  useEffect(() => {
    const fetchBatchAndCreator = async () => {
      try {
        setLoading(true);
        const batchRef = doc(db, 'batchInventory', id);
        const batchSnap = await getDoc(batchRef);
        
        if (!batchSnap.exists()) {
          setError('Batch not found');
          setLoading(false);
          return;
        }

        const batchData = batchSnap.data();
        setBatch(batchData);

        if (batchData.createdBy) {
          const email = batchData.createdBy;
          let profile = null;

          const fetchProfile = async (collectionName) => {
            const q = query(collection(db, collectionName), where('email', '==', email));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) return snapshot.docs[0].data();
            return null;
          };

          profile = await fetchProfile('staffs') || await fetchProfile('managers');

          if (profile) {
            const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
            setCreatorFullName(fullName || profile.displayName || email.split('@')[0]);
          } else {
            setCreatorFullName(email.split('@')[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching batch details:', err);
        setError('Failed to load batch details');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchAndCreator();
  }, [id]);

  if (loading) {
    return <LoadingScreen message="Loading Batch Details" description="Please wait while we fetch the batch information" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-24 w-24 text-red-500 mb-6"
        >
          <FiPackage className="w-full h-full" />
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Batch</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <Button 
            onClick={() => navigate('/batches')}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Back to Batches
          </Button>
        </motion.div>
      </div>
    );
  }

  const totalQuantity = batch.items?.reduce((sum, item) => 
    sum + item.sizes?.reduce((sizeSum, size) => sizeSum + (size.quantity || 0), 0), 0) || 0;

  const totalValue = batch.items?.reduce((sum, item) => 
    sum + item.sizes?.reduce((sizeSum, size) => sizeSum + ((size.quantity || 0) * (item.price || 0)), 0), 0) || 0;

  // Format creator name from email
  const creatorName = batch.createdBy?.split('@')[0]
    ?.split(/[._]/)
    ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
    ?.join(' ');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-black p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/batches')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{batch.name}</h1>
              <p className="text-gray-500 dark:text-gray-400">{batch.type}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${totalQuantity === 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50' : 'bg-white dark:bg-black border-gray-200/50 dark:border-gray-700/50'} p-6 rounded-2xl border shadow-sm flex items-center gap-4`}
          >
            <div className={`p-3 ${totalQuantity === 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/20'} rounded-xl`}>
              <FiBox className={`w-6 h-6 ${totalQuantity === 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Items</h3>
              <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalQuantity} pcs</p>
                {totalQuantity === 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Depleted
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-black p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm flex items-center gap-4"
          >
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <FiDollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Value</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalValue.toFixed(2)}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-black p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm flex items-center gap-4"
          >
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <FiUser className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created By</h3>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{creatorFullName || creatorName}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-black p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm flex items-center gap-4"
          >
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <FiCalendar className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created On</h3>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {new Date(batch.createdAt?.seconds * 1000).toLocaleDateString()}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Variants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-black p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm space-y-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Variants</h2>
          
          <div className="space-y-4">
            {batch.items?.map((variant, index) => {
              const variantTotalQuantity = variant.sizes?.reduce((sum, sizeObj) => sum + (parseInt(sizeObj.quantity) || 0), 0) || 0;
              const isVariantDepleted = variantTotalQuantity === 0;
              
              return (
                <div 
                  key={index} 
                  className={`p-5 rounded-xl border ${
                    isVariantDepleted 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50' 
                    : 'bg-gray-50 dark:bg-gray-700/20 dark:border-gray-700/50'
                  }`}
                >
                <div className="grid md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Variant</label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{variant.variantType}</p>
                        {isVariantDepleted && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Depleted
                          </span>
                        )}
                      </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Color</label>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="w-4 h-4 rounded-full border dark:border-gray-600" style={{ backgroundColor: variant.color.toLowerCase() }}></div>
                       <p className="font-semibold text-gray-800 dark:text-gray-200">{variant.color}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Price</label>
                    <p className="mt-1 font-semibold text-gray-800 dark:text-gray-200">${variant.price}</p>
                  </div>
                </div>

                {/* Sizes */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Available Sizes & Quantities</label>
                  <div className="flex flex-wrap gap-3">
                      {variant.sizes?.map((sizeObj) => {
                        const isSizeDepleted = sizeObj.quantity === 0;
                        
                        return (
                          <div 
                            key={sizeObj.size} 
                            className={`flex flex-col gap-1 px-3 py-1.5 rounded-lg border ${
                              isSizeDepleted 
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' 
                              : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{sizeObj.size}</span>
                            <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                              isSizeDepleted
                              ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                              : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                            }`}>
                              {sizeObj.quantity} pcs
                            </span>
                            {isSizeDepleted && (
                              <div className="text-xs text-red-500 mt-1 font-medium">
                                Depleted: {sizeObj.depletedAt ? 
                                  (sizeObj.depletedAt.toDate ? 
                                    sizeObj.depletedAt.toDate().toLocaleDateString('en-US', {
                                      year: 'numeric', month: 'short', day: 'numeric'
                                    }) 
                                    : new Date(sizeObj.depletedAt.seconds * 1000).toLocaleDateString('en-US', {
                                      year: 'numeric', month: 'short', day: 'numeric'
                                    })
                                  ) 
                                  : (batch.updatedAt ? 
                                      new Date(batch.updatedAt.seconds * 1000).toLocaleDateString('en-US', {
                                        year: 'numeric', month: 'short', day: 'numeric'
                                      }) + ' (estimated)'
                                      : 'Date not recorded'
                                    )
                                }
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Depletion History Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-black p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm space-y-6"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Depletion History</h2>
            {totalQuantity === 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                Fully Depleted
              </span>
            )}
          </div>
          
          {/* Collect all depleted sizes from all variants */}
          {(() => {
            const depletedItems = [];
            
            batch.items?.forEach(variant => {
              variant.sizes?.forEach(sizeObj => {
                if (sizeObj.quantity === 0) {
                  depletedItems.push({
                    variant: variant.variantType,
                    color: variant.color,
                    size: sizeObj.size,
                    depletedAt: sizeObj.depletedAt,
                    // Use fallback date if depletedAt is not available
                    sortDate: sizeObj.depletedAt 
                      ? (sizeObj.depletedAt.seconds * 1000) 
                      : (batch.updatedAt ? batch.updatedAt.seconds * 1000 : 0)
                  });
                }
              });
            });
            
            // Sort by depletion date (newest first)
            depletedItems.sort((a, b) => b.sortDate - a.sortDate);
            
            if (depletedItems.length === 0) {
              return (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg text-center text-gray-500 dark:text-gray-400">
                  No items have been depleted yet.
                </div>
              );
            }
            
            return (
              <div className="mt-4 space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Variant</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Color</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Depleted On</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-700">
                      {depletedItems.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-black' : 'bg-gray-50 dark:bg-gray-800/20'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{item.variant}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border dark:border-gray-600" style={{ backgroundColor: item.color.toLowerCase() }}></div>
                            {item.color}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.size}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.depletedAt ? 
                              (item.depletedAt.toDate ? 
                                item.depletedAt.toDate().toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'short', day: 'numeric'
                                }) 
                                : new Date(item.depletedAt.seconds * 1000).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'short', day: 'numeric'
                                })
                              ) 
                              : (batch.updatedAt ? 
                                  new Date(batch.updatedAt.seconds * 1000).toLocaleDateString('en-US', {
                                    year: 'numeric', month: 'short', day: 'numeric'
                                  }) + ' (estimated)'
                                  : 'Date not recorded'
                                )
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </motion.div>
      </div>
    </div>
  );
}

export default BatchDetails;