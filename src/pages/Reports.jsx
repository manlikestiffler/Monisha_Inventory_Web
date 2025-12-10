import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, Package, Users } from 'lucide-react';
import { useThemeDetector } from '../hooks/useThemeDetector';
import LoadingScreen from '../components/ui/LoadingScreen';
import SchoolSelect from '../components/SchoolSelect';
import { getChartColors, getCommonChartProps } from '../utils/chartColors';
import { exportToExcel, exportToPDF, exportToDocx } from '../utils/exportHelper';
import { Download } from 'lucide-react';

const Reports = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [variantData, setVariantData] = useState([]);
  const [uniformsData, setUniformsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]); // Dynamic years
  const [ordersData, setOrdersData] = useState([]);
  const [batchesData, setBatchesData] = useState([]);
  const [schoolsData, setSchoolsData] = useState([]);
  const isDark = useThemeDetector();

  const categories = [
    { id: 'overview', name: 'Overview', icon: TrendingUp },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'financials', name: 'Financials', icon: DollarSign },
    { id: 'schools', name: 'Schools', icon: Users }
  ];

  // Fetch Data
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [uniformsSnap, variantsSnap, ordersSnap, batchesSnap, schoolsSnap] = await Promise.all([
          getDocs(collection(db, 'uniforms')),
          getDocs(collection(db, 'uniform_variants')),
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'batchInventory')),
          getDocs(collection(db, 'schools'))
        ]);

        const variants = variantsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        const uniforms = uniformsSnap.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          variants: variants.filter(v => v.uniformId === doc.id)
        }));
        const orders = ordersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        const batches = batchesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        const schools = schoolsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        setUniformsData(uniforms);
        setOrdersData(orders);
        setBatchesData(batches);
        setSchoolsData(schools);

        // Calculate available years
        const yearsSet = new Set([new Date().getFullYear()]);
        batches.forEach(b => {
          if (b.createdAt?.toDate) yearsSet.add(b.createdAt.toDate().getFullYear());
          else if (b.createdAt?.seconds) yearsSet.add(new Date(b.createdAt.seconds * 1000).getFullYear());
        });
        uniforms.forEach(u => {
          u.variants?.forEach(v => {
            v.allocationHistory?.forEach(a => {
              const d = a.allocatedAt ? new Date(a.allocatedAt) : (a.date ? new Date(a.date) : null);
              if (d) yearsSet.add(d.getFullYear());
            });
          });
        });
        setAvailableYears(Array.from(yearsSet).sort((a, b) => a - b));

      } catch (err) {
        console.error("Error fetching report data:", err);
        setError("Failed to load report data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Filter Helpers
  const getFilteredUniforms = useCallback(() => {
    if (!selectedSchool) return uniformsData;
    return uniformsData.filter(item =>
      item.schoolId === selectedSchool ||
      item.school === selectedSchool ||
      item.school?.id === selectedSchool
    );
  }, [uniformsData, selectedSchool]);

  const getFilteredBatches = useCallback(() => {
    if (!selectedSchool) return batchesData;
    // Note: Batches are typically warehouse stock. 
    // Only filter if batches explicitly have schoolId. 
    // If most don't, this returns empty, which is correct for "School Stock from Warehouse" 
    // BUT might not be what user wants if they expect to see linked product stock.
    return batchesData.filter(batch => batch.schoolId === selectedSchool);
  }, [batchesData, selectedSchool]);

  const getFilteredAllocations = useCallback(() => {
    const allocations = [];
    // Allocations are derived from UNIFORMS (Products), so we use filtered uniforms.
    const filteredUniforms = getFilteredUniforms();

    filteredUniforms.forEach(uniform => {
      uniform.variants?.forEach(variant => {
        variant.allocationHistory?.forEach(allocation => {
          allocations.push({
            ...allocation,
            productName: uniform.name,
            price: uniform.price || 0,
            allocatedAt: allocation.allocatedAt || allocation.date
          });
        });
      });
    });
    return allocations;
  }, [getFilteredUniforms]);

  // Update Chart Data based on filters
  useEffect(() => {
    const filteredUniforms = getFilteredUniforms();

    const typeCount = {};
    const variantCount = {};

    filteredUniforms.forEach(item => {
      // Type Count
      const type = item.type || 'Uncategorized';
      let quantity = 0;
      if (item.variants?.length > 0) {
        quantity = item.variants.reduce((sum, v) => sum + (v.sizes?.reduce((s, sz) => s + (parseInt(sz.quantity) || 0), 0) || 0), 0);
      } else {
        quantity = item.sizes?.reduce((s, sz) => s + (parseInt(sz.quantity) || 0), 0) || 0;
      }
      typeCount[type] = (typeCount[type] || 0) + quantity;

      // Variant Count
      if (item.variants?.length > 0) {
        item.variants.forEach(v => {
          const vName = `${item.name} (${v.variantType || v.name || v.variant || 'Std'})`;
          const vQty = v.sizes?.reduce((s, sz) => s + (parseInt(sz.quantity) || 0), 0) || 0;
          if (vQty > 0) variantCount[vName] = (variantCount[vName] || 0) + vQty;
        });
      } else {
        const iQty = item.sizes?.reduce((s, sz) => s + (parseInt(sz.quantity) || 0), 0) || 0;
        if (iQty > 0) variantCount[item.name] = (variantCount[item.name] || 0) + iQty;
      }
    });

    setInventoryData(Object.entries(typeCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    setVariantData(Object.entries(variantCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));

  }, [getFilteredUniforms, selectedSchool]);


  // Analytics Functions
  const getSalesData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearlySales = Array(12).fill(0);
    const allocations = getFilteredAllocations();
    const targetYear = parseInt(selectedYear);

    allocations.forEach(allocation => {
      if (allocation.allocatedAt) {
        const date = new Date(allocation.allocatedAt);
        if (date.getFullYear() === targetYear) {
          const revenue = (Number(allocation.quantity) || 0) * (Number(allocation.price) || 0);
          yearlySales[date.getMonth()] += revenue;
        }
      }
    });

    return monthNames.map((month, index) => ({
      name: month,
      revenue: yearlySales[index]
    }));
  };

  const getFinancialOverview = () => {
    const realizedRevenue = getFilteredAllocations().reduce((sum, a) => sum + ((Number(a.quantity) || 0) * (Number(a.price) || 0)), 0);

    // Potential Revenue (In Stock)
    // 1. From Batches (if matches filter)
    const batchPotential = getFilteredBatches().reduce((sum, b) => {
      return sum + (b.items?.reduce((isum, item) => {
        return isum + (item.sizes?.reduce((ssum, size) => ssum + ((parseInt(size.quantity) || 0) * (parseInt(item.price || 0))), 0) || 0);
      }, 0) || 0);
    }, 0);

    // 2. From Uniforms (School Stock)
    const productPotential = getFilteredUniforms().reduce((sum, u) => {
      return sum + (u.variants?.reduce((vsum, v) => {
        return vsum + (v.sizes?.reduce((ssum, s) => ssum + ((parseInt(s.quantity) || 0) * (parseInt(u.price || 0))), 0) || 0);
      }, 0) || (u.sizes?.reduce((ssum, s) => ssum + ((parseInt(s.quantity) || 0) * (parseInt(u.price || 0))), 0) || 0));
    }, 0);

    return [
      { name: 'Realized Revenue', value: realizedRevenue, fill: getChartColors().success },
      { name: 'Potential Revenue', value: batchPotential + productPotential, fill: getChartColors().primary }
    ];
  };

  const getSizeDemandData = () => {
    const sizeData = {};
    const addToData = (size, qty) => sizeData[size] = (sizeData[size] || 0) + qty;

    // Batches
    getFilteredBatches().forEach(b => b.items?.forEach(i => i.sizes?.forEach(s => addToData(s.size, parseInt(s.quantity) || 0))));
    // Uniforms
    getFilteredUniforms().forEach(u => {
      u.variants?.forEach(v => v.sizes?.forEach(s => addToData(s.size, parseInt(s.quantity) || 0)));
      u.sizes?.forEach(s => addToData(s.size, parseInt(s.quantity) || 0));
    });
    // Allocations
    getFilteredAllocations().forEach(a => addToData(a.size, parseInt(a.quantity) || 0));

    return Object.entries(sizeData)
      .sort(([a], [b]) => {
        const nA = parseInt(a), nB = parseInt(b);
        return (!isNaN(nA) && !isNaN(nB)) ? nA - nB : a.localeCompare(b);
      })
      .slice(0, 10)
      .map(([name, volume]) => ({ name, volume }));
  };

  const getYearOverYearData = () => {
    const yearlyData = {};
    availableYears.forEach(y => yearlyData[y] = 0);

    getFilteredAllocations().forEach(a => {
      if (a.allocatedAt) {
        const y = new Date(a.allocatedAt).getFullYear();
        if (yearlyData[y] !== undefined) yearlyData[y] += ((Number(a.quantity) || 0) * (Number(a.price) || 0));
      }
    });

    return Object.entries(yearlyData).map(([name, revenue]) => ({ name, revenue }));
  };

  const getTotalRevenue = () => getFilteredAllocations().reduce((sum, a) => sum + ((Number(a.quantity) || 0) * (Number(a.price) || 0)), 0);

  const renderContent = () => {
    if (loading) return <div className="flex justify-center items-center h-96"><LoadingScreen /></div>;
    if (error) return <div className="flex justify-center items-center h-96 text-red-500"><AlertTriangle className="w-12 h-12" /><p className="mt-4">{error}</p></div>;

    // Chart Components
    const YearSelector = () => (
      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</span>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
    );

    const ExportButton = ({ data, title, columns }) => (
      <button onClick={() => exportToExcel(data, columns, title, `${title}_${selectedYear}`)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400">
        <Download className="w-5 h-5" />
      </button>
    );

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="mb-6 space-y-4">
          <SchoolSelect onChange={setSelectedSchool} value={selectedSchool} />

          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                  >
                    <Icon size={16} /> {cat.name}
                  </button>
                );
              })}
            </div>
            {/* Show Year Selector for Overview and Financials */}
            {(selectedCategory === 'overview' || selectedCategory === 'financials') && <YearSelector />}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="stats-card bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg mr-4"><DollarSign className="text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Revenue</p><p className="text-2xl font-bold">${getTotalRevenue().toLocaleString()}</p></div>
          </div>
          <div className="stats-card bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg mr-4"><Package className="text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Allocations</p><p className="text-2xl font-bold">{getFilteredAllocations().length}</p></div>
          </div>
          <div className="stats-card bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg mr-4"><Users className="text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Schools</p><p className="text-2xl font-bold">{selectedSchool ? 1 : schoolsData.length}</p></div>
          </div>
          <div className="stats-card bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg mr-4"><Package className="text-orange-600" /></div>
            <div><p className="text-sm text-gray-500">Batches</p><p className="text-2xl font-bold">{getFilteredBatches().length}</p></div>
          </div>
        </div>

        {/* Content */}
        {selectedCategory === 'overview' && (
          <div className="space-y-8">
            {/* Financial Overview */}
            <motion.div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-6">Financial Overview</h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getFinancialOverview()} barSize={60}>
                    <defs>
                      <linearGradient id="realizedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getChartColors().success} stopOpacity={0.9} />
                        <stop offset="95%" stopColor={getChartColors().success} stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="potentialGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getChartColors().primary} stopOpacity={0.9} />
                        <stop offset="95%" stopColor={getChartColors().primary} stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 14, fontWeight: 500 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="value" name="Revenue" radius={[8, 8, 0, 0]}>
                      {getFinancialOverview().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#${index === 0 ? 'realizedGradient' : 'potentialGradient'})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Realized (Sold)</p>
                  <p className="text-2xl font-bold text-green-600">${getFinancialOverview()[0].value.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Potential (In Stock)</p>
                  <p className="text-2xl font-bold text-blue-600">${getFinancialOverview()[1].value.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            {/* Revenue Trend */}
            <motion.div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Revenue Trend ({selectedYear})</h3>
                <ExportButton data={getSalesData()} title="Revenue" columns={[{ header: 'Month', key: 'name' }, { header: 'Rev', key: 'revenue' }]} />
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getSalesData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={getChartColors().primary}
                      strokeWidth={4}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        )}

        {selectedCategory === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700 col-span-2">
              <h3 className="text-lg font-bold mb-4">Size Demand</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getSizeDemandData()}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="volume" fill={getChartColors().success} /></BarChart>
              </ResponsiveContainer>
            </motion.div>
            <motion.div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-4">Inventory by Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventoryData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="count" fill={getChartColors().primary} /></BarChart>
              </ResponsiveContainer>
            </motion.div>
            <motion.div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-4">Top Variants</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={variantData.slice(0, 10)} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={100} /><Tooltip /><Bar dataKey="count" fill={getChartColors().warning} /></BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {selectedCategory === 'financials' && (
          <div className="grid grid-cols-1 gap-8">
            <motion.div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-4">Monthly Revenue ({selectedYear})</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={getSalesData()}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="revenue" stroke={getChartColors().success} strokeWidth={3} /></LineChart>
              </ResponsiveContainer>
            </motion.div>
            <motion.div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-4">Year Over Year</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getYearOverYearData()}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill={getChartColors().primary} /></BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {selectedCategory === 'schools' && (
          <div className="space-y-4">
            {schoolsData.filter(s => !selectedSchool || s.id === selectedSchool).map(school => {
              const val = ordersData.filter(o => o.schoolId === school.id).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
              return (
                <div key={school.id} className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow flex justify-between items-center">
                  <div><h4 className="font-bold">{school.name}</h4><p className="text-sm text-gray-500">{school.studentCount || 'N/A'} Students</p></div>
                  <div className="text-right"><h4 className="font-bold text-green-600">${val.toLocaleString()}</h4></div>
                </div>
              );
            })}
          </div>
        )}

      </motion.div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Analytics & Reports</h1>
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Reports;