import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, Package, Users } from 'lucide-react';
import { useThemeDetector } from '../hooks/useThemeDetector';
import LoadingScreen from '../components/ui/LoadingScreen';
import SchoolSelect from '../components/SchoolSelect';
import { getChartColors, getCommonChartProps } from '../utils/chartColors';

const Reports = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [variantData, setVariantData] = useState([]);
  const [uniformsData, setUniformsData] = useState([]); // Store raw uniforms data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
  const years = [2022, 2023, 2024, 2025];

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch uniforms data
        const uniformsSnapshot = await getDocs(collection(db, 'uniforms'));
        let uniforms = uniformsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        // Fetch variants for each uniform to get allocation history
        const variantsSnapshot = await getDocs(collection(db, 'uniform_variants'));
        const variants = variantsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        // Attach variants to uniforms
        uniforms = uniforms.map(uniform => ({
          ...uniform,
          variants: variants.filter(v => v.uniformId === uniform.id)
        }));

        setUniformsData(uniforms);

        // Fetch orders data (mobile analytics functionality)
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const orders = ordersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setOrdersData(orders);

        // Fetch batches data
        const batchesSnapshot = await getDocs(collection(db, 'batchInventory'));
        const batches = batchesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setBatchesData(batches);

        // Fetch schools data
        const schoolsSnapshot = await getDocs(collection(db, 'schools'));
        const schools = schoolsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setSchoolsData(schools);

        // Filter uniforms by school if selected
        let filteredUniforms = uniforms;
        if (selectedSchool) {
          filteredUniforms = uniforms.filter(item => item.school === selectedSchool || item.schoolId === selectedSchool);
        }

        console.log('📊 Reports - Uniforms:', uniforms.length);
        console.log('📊 Reports - Filtered Uniforms:', filteredUniforms.length);

        const typeCount = filteredUniforms.reduce((acc, item) => {
          const type = item.type || 'Uncategorized';
          let totalQuantity = 0;

          // Count from variants
          if (item.variants && item.variants.length > 0) {
            totalQuantity = item.variants.reduce((sum, variant) => {
              if (variant.sizes && Array.isArray(variant.sizes)) {
                return sum + variant.sizes.reduce((s, size) => s + (parseInt(size.quantity) || 0), 0);
              }
              return sum;
            }, 0);
          }
          // Fallback to direct sizes if no variants (legacy structure support)
          else if (item.sizes && Array.isArray(item.sizes)) {
            totalQuantity = item.sizes.reduce((s, size) => s + (parseInt(size.quantity) || 0), 0);
          }

          acc[type] = (acc[type] || 0) + totalQuantity;
          return acc;
        }, {});

        const variantCount = filteredUniforms.reduce((acc, item) => {
          if (item.variants && item.variants.length > 0) {
            item.variants.forEach(variant => {
              const variantName = `${item.name} (${variant.variant || 'Standard'})`;
              let variantQuantity = 0;
              if (variant.sizes && Array.isArray(variant.sizes)) {
                variantQuantity = variant.sizes.reduce((s, size) => s + (parseInt(size.quantity) || 0), 0);
              }

              if (variantQuantity > 0) {
                acc[variantName] = (acc[variantName] || 0) + variantQuantity;
              }
            });
          } else if (item.sizes && Array.isArray(item.sizes)) {
            // Handle products without variants
            const itemName = item.name;
            const itemQuantity = item.sizes.reduce((s, size) => s + (parseInt(size.quantity) || 0), 0);
            if (itemQuantity > 0) {
              acc[itemName] = (acc[itemName] || 0) + itemQuantity;
            }
          }
          return acc;
        }, {});

        console.log('📊 Reports - Type Count:', typeCount);
        console.log('📊 Reports - Variant Count:', variantCount);

        const typeChartData = Object.keys(typeCount)
          .map(key => ({ name: key, count: typeCount[key] }))
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count); // Sort by count descending

        const variantChartData = Object.keys(variantCount)
          .map(key => ({ name: key, count: variantCount[key] }))
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count); // Sort by count descending

        setInventoryData(typeChartData);
        setVariantData(variantChartData);

      } catch (err) {
        console.error("Error fetching report data:", err);
        setError("Failed to load report data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [selectedSchool]);

  // Helper to filter data by school
  const getFilteredOrders = useCallback(() => {
    if (!selectedSchool) return ordersData;
    return ordersData.filter(order => order.schoolId === selectedSchool || order.school === selectedSchool);
  }, [ordersData, selectedSchool]);

  const getFilteredBatches = useCallback(() => {
    if (!selectedSchool) return batchesData;
    return batchesData.filter(batch => batch.schoolId === selectedSchool);
  }, [batchesData, selectedSchool]);

  const getFilteredUniforms = useCallback(() => {
    if (!selectedSchool) return uniformsData;
    return uniformsData.filter(uniform => uniform.school === selectedSchool || uniform.schoolId === selectedSchool);
  }, [uniformsData, selectedSchool]);

  // Helper to get all allocations (Sold/Depleted items)
  const getFilteredAllocations = useCallback(() => {
    const allocations = [];
    const filteredUniforms = getFilteredUniforms();

    filteredUniforms.forEach(uniform => {
      if (uniform.variants) {
        uniform.variants.forEach(variant => {
          if (variant.allocationHistory && Array.isArray(variant.allocationHistory)) {
            variant.allocationHistory.forEach(allocation => {
              allocations.push({
                ...allocation,
                productName: uniform.name,
                price: uniform.price || 0,
                allocatedAt: allocation.allocatedAt || allocation.date
              });
            });
          }
        });
      }
    });
    return allocations;
  }, [getFilteredUniforms]);



  // Mobile analytics functions
  const getSalesData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    const salesByMonth = Array(6).fill(0);
    const allocations = getFilteredAllocations();

    // If a specific year is selected, show all 12 months for that year
    if (selectedCategory === 'financials') {
      const yearlySales = Array(12).fill(0);

      allocations.forEach(allocation => {
        if (allocation.allocatedAt) {
          const date = new Date(allocation.allocatedAt);
          if (date.getFullYear() === parseInt(selectedYear)) {
            const revenue = (Number(allocation.quantity) || 0) * (Number(allocation.price) || 0);
            yearlySales[date.getMonth()] += revenue;
          }
        }
      });

      return monthNames.map((month, index) => ({
        name: month,
        revenue: yearlySales[index]
      }));
    }

    // Default view: Last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6Months.push(monthNames[monthIndex]);
    }

    allocations.forEach(allocation => {
      if (allocation.allocatedAt) {
        const date = new Date(allocation.allocatedAt);
        const month = date.getMonth();
        const monthsAgo = (currentMonth - month + 12) % 12;

        // Check if it's within the last 6 months (and same year logic roughly, or just recent)
        // Simple check: is the date within the last 6 months window
        const sixMonthsAgoDate = new Date();
        sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 6);

        if (date >= sixMonthsAgoDate) {
          // Find the correct index in our last6Months array
          // This is a bit tricky with wrapping years. 
          // Let's align by month index.
          const index = last6Months.findIndex(m => m === monthNames[month]);
          if (index !== -1) {
            const revenue = (Number(allocation.quantity) || 0) * (Number(allocation.price) || 0);
            salesByMonth[index] += revenue;
          }
        }
      }
    });

    return last6Months.map((month, index) => ({
      name: month,
      revenue: salesByMonth[index]
    }));
  };

  const getOrderStatusData = () => {
    const orders = getFilteredOrders();
    const completed = orders.filter(o => o.status === 'completed').length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const colors = getChartColors();

    return [
      { name: 'Completed', value: completed, fill: colors.success },
      { name: 'Pending', value: pending, fill: colors.warning },
      { name: 'Processing', value: processing, fill: colors.danger }
    ];
  };

  const getTotalRevenue = () => {
    return getFilteredAllocations().reduce((total, allocation) => {
      return total + ((Number(allocation.quantity) || 0) * (Number(allocation.price) || 0));
    }, 0);
  };

  const getYearOverYearData = () => {
    const yearlyData = {};
    const allocations = getFilteredAllocations();

    // Find the earliest year from allocations or batches
    let startYear = new Date().getFullYear();

    // Check allocations
    allocations.forEach(a => {
      if (a.allocatedAt) {
        const year = new Date(a.allocatedAt).getFullYear();
        if (year < startYear) startYear = year;
      }
    });

    // Check batches (creation date) to ensure we cover the start of operations
    getFilteredBatches().forEach(b => {
      if (b.createdAt?.seconds) {
        const year = new Date(b.createdAt.seconds * 1000).getFullYear();
        if (year < startYear) startYear = year;
      }
    });

    // Generate all years from startYear to currentYear
    const currentYear = new Date().getFullYear();
    for (let year = startYear; year <= currentYear; year++) {
      yearlyData[year] = 0;
    }

    // Fill in revenue
    allocations.forEach(allocation => {
      if (allocation.allocatedAt) {
        const date = new Date(allocation.allocatedAt);
        const year = date.getFullYear();
        const revenue = (Number(allocation.quantity) || 0) * (Number(allocation.price) || 0);
        if (yearlyData[year] !== undefined) {
          yearlyData[year] += revenue;
        }
      }
    });

    return Object.entries(yearlyData)
      .map(([year, revenue]) => ({ name: year, revenue }))
      .sort((a, b) => a.name - b.name);
  };

  const getFinancialOverview = () => {
    // Realized Revenue: From Allocations (Sold/Distributed)
    const realizedRevenue = getFilteredAllocations().reduce((sum, allocation) => {
      return sum + ((Number(allocation.quantity) || 0) * (Number(allocation.price) || 0));
    }, 0);

    // Potential Revenue: From Current Stock (Batches + Products)
    // 1. Batch Stock
    const batchPotential = getFilteredBatches().reduce((sum, batch) => {
      return sum + (batch.items?.reduce((itemSum, item) => {
        return itemSum + (item.sizes?.reduce((sizeSum, size) => {
          // Note: Batches might not have price. We should ideally look up the product price.
          // For now, if batch item has price, use it. If not, we might miss this value.
          // Assuming batch items have a price field or we can't calculate it easily without a lookup map.
          // Let's use the item.price if available.
          return sizeSum + ((parseInt(size.quantity) || 0) * (parseInt(item.price) || 0));
        }, 0) || 0);
      }, 0) || 0);
    }, 0);

    // 2. Product Stock (School Inventory)
    const productPotential = getFilteredUniforms().reduce((sum, uniform) => {
      if (uniform.variants) {
        return sum + uniform.variants.reduce((vSum, variant) => {
          return vSum + (variant.sizes?.reduce((sSum, size) => {
            return sSum + ((parseInt(size.quantity) || 0) * (parseInt(uniform.price) || 0));
          }, 0) || 0);
        }, 0);
      }
      return sum;
    }, 0);

    return [
      { name: 'Realized Revenue (Sold/Depleted)', value: realizedRevenue, fill: getChartColors().success },
      { name: 'Potential Revenue (In Stock)', value: batchPotential + productPotential, fill: getChartColors().primary }
    ];
  };

  const getSizeDemandData = () => {
    const sizeData = {};

    // 1. Add Current Stock (Batches) - Warehouse
    getFilteredBatches().forEach(batch => {
      if (batch.items && Array.isArray(batch.items)) {
        batch.items.forEach(item => {
          if (item.sizes && Array.isArray(item.sizes)) {
            item.sizes.forEach(size => {
              const sizeKey = size.size;
              if (!sizeData[sizeKey]) sizeData[sizeKey] = 0;
              sizeData[sizeKey] += parseInt(size.quantity) || 0;
            });
          }
        });
      }
    });

    // 2. Add School Inventory (Products) - Distributed but not sold
    getFilteredUniforms().forEach(uniform => {
      if (uniform.variants) {
        uniform.variants.forEach(variant => {
          if (variant.sizes && Array.isArray(variant.sizes)) {
            variant.sizes.forEach(size => {
              const sizeKey = size.size;
              if (!sizeData[sizeKey]) sizeData[sizeKey] = 0;
              sizeData[sizeKey] += parseInt(size.quantity) || 0;
            });
          }
        });
      }
    });

    // 3. Add Sold Items (Allocations) - Depleted
    getFilteredAllocations().forEach(allocation => {
      const sizeKey = allocation.size;
      if (sizeKey) {
        if (!sizeData[sizeKey]) sizeData[sizeKey] = 0;
        sizeData[sizeKey] += parseInt(allocation.quantity) || 0;
      }
    });

    return Object.entries(sizeData)
      .sort(([a], [b]) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      })
      .slice(0, 10)
      .map(([size, quantity]) => ({ name: size, volume: quantity }));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-96">
          <LoadingScreen message="Generating Reports..." />
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-96 text-red-500">
          <AlertTriangle className="w-12 h-12" />
          <p className="mt-4">{error}</p>
        </div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="mb-6 space-y-4">
          <SchoolSelect onChange={setSelectedSchool} value={selectedSchool} />

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  <IconComponent size={16} />
                  {category.name}
                </button>
              );
            })}
          </div>

          {/* Year Filter */}
          {(selectedCategory === 'financials') && (
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</span>
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${selectedYear === year
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">${getTotalRevenue().toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Allocations</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{getFilteredAllocations().length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Batches</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{getFilteredBatches().length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Schools</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{selectedSchool ? 1 : schoolsData.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Based on Selected Category */}
        {selectedCategory === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Financial Overview (Realized vs Potential) */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Financial Overview (Realized vs Potential)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getFinancialOverview()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]}>
                    {getFinancialOverview().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center text-sm text-gray-500">
                Includes value of depleted (sold) items and current stock.
              </div>
            </motion.div>

            {/* Revenue Trend */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Revenue Trend (Last 6 Months)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getSalesData()}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis dataKey="name" {...getCommonChartProps().xAxis} />
                  <YAxis {...getCommonChartProps().yAxis} />
                  <Tooltip {...getCommonChartProps().tooltip} formatter={(value) => `$${value.toLocaleString()}`} />
                  <Line type="monotone" dataKey="revenue" stroke={getChartColors().primary} strokeWidth={3} dot={{ fill: getChartColors().primary }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {selectedCategory === 'inventory' && (
          <div className="space-y-8">
            {/* Size Demand Pattern (Total Volume) */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Size Patterns (Total Volume: Sold + In Stock)</h2>
              <p className="text-sm text-gray-500 mb-4">This chart includes depleted items to show true historical demand.</p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getSizeDemandData()}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis dataKey="name" {...getCommonChartProps().xAxis} />
                  <YAxis {...getCommonChartProps().yAxis} />
                  <Tooltip {...getCommonChartProps().tooltip} />
                  <Bar dataKey="volume" name="Total Volume" fill={getChartColors().success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Inventory by Type */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Inventory by Type</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={inventoryData}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis dataKey="name" {...getCommonChartProps().xAxis} />
                  <YAxis {...getCommonChartProps().yAxis} />
                  <Tooltip {...getCommonChartProps().tooltip} />
                  <Bar dataKey="count" fill={getChartColors().primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Top Variants */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Top Variants</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart layout="vertical" data={variantData.slice(0, 8)}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis type="number" {...getCommonChartProps().xAxis} />
                  <YAxis type="category" dataKey="name" {...getCommonChartProps().yAxis} width={150} />
                  <Tooltip {...getCommonChartProps().tooltip} />
                  <Bar dataKey="count" fill={getChartColors().success} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {selectedCategory === 'financials' && (
          <div className="space-y-8">
            {/* Year over Year Comparison */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Year Over Year Revenue</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getYearOverYearData()}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis dataKey="name" {...getCommonChartProps().xAxis} />
                  <YAxis {...getCommonChartProps().yAxis} />
                  <Tooltip {...getCommonChartProps().tooltip} formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill={getChartColors().primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Monthly Breakdown for Selected Year */}
            <motion.div className="surface rounded-2xl shadow-elevation-2 p-6 border border-base">
              <h2 className="text-xl font-bold text-base mb-6">Monthly Revenue Breakdown ({selectedYear})</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={getSalesData()}>
                  <CartesianGrid {...getCommonChartProps().cartesianGrid} />
                  <XAxis dataKey="name" {...getCommonChartProps().xAxis} />
                  <YAxis {...getCommonChartProps().yAxis} />
                  <Tooltip {...getCommonChartProps().tooltip} formatter={(value) => `$${value.toLocaleString()}`} />
                  <Line type="monotone" dataKey="revenue" stroke={getChartColors().success} strokeWidth={3} dot={{ fill: getChartColors().success }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {selectedCategory === 'schools' && (
          <div className="space-y-8">
            {/* School Performance */}
            <motion.div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">School Performance</h2>
              <div className="space-y-4">
                {schoolsData
                  .filter(school => !selectedSchool || school.id === selectedSchool)
                  .map((school, index) => {
                    const schoolOrders = ordersData.filter(o => o.schoolId === school.id);
                    const totalValue = schoolOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

                    return (
                      <div key={school.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{school.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {schoolOrders.length} orders • {school.studentCount || 0} students
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-gray-100">${totalValue.toFixed(2)}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ${school.studentCount ? (totalValue / school.studentCount).toFixed(2) : '0.00'}/student
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Analytics & Reports</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Comprehensive business intelligence and inventory analytics.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key="inventory-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Reports;