import { useState } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Cell } from 'recharts';
import AnimatedCard from '../ui/AnimatedCard';
import ModernSelect from '../ui/ModernSelect';
import { useThemeDetector } from '../../hooks/useThemeDetector';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899'];

// Move calculateTotals outside component
const calculateTotals = (inventory) => {
  const totals = {};
  Object.entries(inventory).forEach(([type, variants]) => {
    totals[type] = {
      total: 0,
      variants: {}
    };
    Object.entries(variants).forEach(([variant, sizes]) => {
      totals[type].variants[variant] = sizes.reduce((sum, size) => sum + size.quantity, 0);
      totals[type].total += totals[type].variants[variant];
    });
  });
  return totals;
};

const DetailedInventoryAnalysis = ({ data, filters, searchQuery }) => {
  const isDark = useThemeDetector();
  const [selectedSchool, setSelectedSchool] = useState(data.schools[0].id);
  const [selectedType, setSelectedType] = useState('all');
  const [view, setView] = useState('grid');

  const gradients = [
    "from-indigo-500 via-blue-500 to-cyan-500",
    "from-emerald-500 via-green-500 to-teal-500",
    "from-rose-500 via-pink-500 to-purple-500",
    "from-amber-500 via-orange-500 to-red-500",
    "from-violet-500 via-purple-500 to-fuchsia-500",
    "from-cyan-500 via-blue-500 to-indigo-500"
  ];

  const school = data.schools.find(s => s.id === selectedSchool);
  const totals = calculateTotals(school.inventory);

  // Filter inventory based on search query and filters
  const filteredInventory = Object.entries(school.inventory).reduce((acc, [type, variants]) => {
    if (selectedType !== 'all' && type !== selectedType) return acc;
    
    const filteredVariants = Object.entries(variants).reduce((varAcc, [variant, sizes]) => {
      const matchesSearch = !searchQuery || variant.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return varAcc;
      
      const filteredSizes = sizes.filter(size => {
        if (!filters || !filters.status) return true;
        
        return filters.status === 'low_stock' ? size.quantity <= size.reorder :
               filters.status === 'out_of_stock' ? size.quantity === 0 :
               true;
      });
      
      if (filteredSizes.length > 0) {
        varAcc[variant] = filteredSizes;
      }
      return varAcc;
    }, {});
    
    if (Object.keys(filteredVariants).length > 0) {
      acc[type] = filteredVariants;
    }
    return acc;
  }, {});

  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? '#374151' : '#E5E7EB';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1F2937' : 'white',
    border: 'none',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '12px',
    color: isDark ? '#F9FAFB' : '#111827'
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory Management</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and track your inventory across all schools</p>
          </div>
          <div className="flex items-center gap-4">
            <ModernSelect
              value={selectedSchool}
              onChange={setSelectedSchool}
              options={data.schools.map(school => ({
                value: school.id,
                label: school.name
              }))}
              className="w-[220px]"
            />
            <div className="flex bg-white dark:bg-gray-700 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-2 rounded-md flex items-center gap-2 ${
                  view === 'grid' 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="text-sm font-medium">Grid</span>
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 rounded-md flex items-center gap-2 ${
                  view === 'list' 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-sm font-medium">List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
            <h4 className="text-sm font-medium text-indigo-100">Total Items</h4>
            <p className="text-2xl font-bold mt-1">{Object.values(totals).reduce((sum, type) => sum + type.total, 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
            <h4 className="text-sm font-medium text-emerald-100">Types</h4>
            <p className="text-2xl font-bold mt-1">{Object.keys(totals).length}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
            <h4 className="text-sm font-medium text-amber-100">Low Stock Items</h4>
            <p className="text-2xl font-bold mt-1">{Object.values(filteredInventory).reduce((sum, variants) => 
              sum + Object.values(variants).reduce((varSum, sizes) => 
                varSum + sizes.filter(size => size.quantity <= size.reorder).length, 0
              ), 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-4 text-white">
            <h4 className="text-sm font-medium text-rose-100">Out of Stock</h4>
            <p className="text-2xl font-bold mt-1">{Object.values(filteredInventory).reduce((sum, variants) => 
              sum + Object.values(variants).reduce((varSum, sizes) => 
                varSum + sizes.filter(size => size.quantity === 0).length, 0
              ), 0)}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Stock Distribution by Size</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(data.metrics.performance.sizeDistribution).map(([size, value]) => ({ size, value }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" vertical={false} />
                  <XAxis dataKey="size" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} dy={10} />
                  <YAxis tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} dx={-10} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value}%`, 'Distribution']}
                    cursor={{ fill: isDark ? 'rgba(75, 85, 99, 0.3)' : '#F3F4F6' }}
                  />
                  <Bar dataKey="value" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {Object.entries(data.metrics.performance.sizeDistribution).map((entry, index) => (
                      <Cell key={index} fill={`#4F46E5${index % 2 === 0 ? 'FF' : 'CC'}`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Stock Levels Over Time</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { month: 'Jan', inStock: 85, lowStock: 10, outOfStock: 5 },
                  { month: 'Feb', inStock: 80, lowStock: 15, outOfStock: 5 },
                  { month: 'Mar', inStock: 75, lowStock: 20, outOfStock: 5 },
                  { month: 'Apr', inStock: 70, lowStock: 20, outOfStock: 10 },
                  { month: 'May', inStock: 75, lowStock: 15, outOfStock: 10 },
                  { month: 'Jun', inStock: 80, lowStock: 15, outOfStock: 5 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} dy={10} />
                  <YAxis tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 12 }} dx={-10} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value}%`, '']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                  <Line type="monotone" dataKey="inStock" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: '#4F46E5', strokeWidth: 2 }} name="In Stock" />
                  <Line type="monotone" dataKey="lowStock" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: '#F59E0B', strokeWidth: 2 }} name="Low Stock" />
                  <Line type="monotone" dataKey="outOfStock" stroke="#EF4444" strokeWidth={2.5} dot={{ fill: '#EF4444', strokeWidth: 2 }} name="Out of Stock" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Inventory Details</h3>
          <div className="space-y-6">
            {view === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(filteredInventory).map(([type, variants], typeIndex) => (
                  <AnimatedCard 
                    key={type} 
                    className={`p-4 bg-gradient-to-br ${gradients[typeIndex % gradients.length]} text-white`}
                  >
                    <div className="flex flex-col h-full">
                      <h3 className="text-base font-semibold text-white mb-3">{type}</h3>
                      <div className="space-y-3 flex-grow">
                        {Object.entries(variants).map(([variant, sizes]) => (
                          <div key={variant} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-sm text-white">{variant}</span>
                              <span className="text-xs text-white/80">
                                Total: {sizes.reduce((sum, size) => sum + size.quantity, 0)}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {sizes.map((size, sizeIndex) => (
                                <div key={sizeIndex} className="bg-white/10 backdrop-blur-sm rounded p-1.5 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="text-white/80">{size.size}</span>
                                    <span className={`font-medium ${size.quantity <= size.reorder ? 'text-red-200' : 'text-white'}`}>
                                      {size.quantity}
                                    </span>
                                  </div>
                                  {size.quantity <= size.reorder && (
                                    <span className="text-xs text-red-200 mt-0.5 block">Low</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(filteredInventory).map(([type, variants], typeIndex) => (
                  <div key={type} className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900">{type}</h4>
                        <span className="text-sm text-gray-500">{Object.keys(variants).length} variants</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Variant</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Stock</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Allocated</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size Distribution</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {Object.entries(variants).map(([variant, sizes]) => {
                            const totalQuantity = sizes.reduce((sum, size) => sum + size.quantity, 0);
                            const totalAllocated = sizes.reduce((sum, size) => sum + size.allocated, 0);
                            const lowStockCount = sizes.filter(size => size.quantity <= size.reorder).length;
                            const outOfStockCount = sizes.filter(size => size.quantity === 0).length;
                            
                            return (
                              <tr key={variant} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{variant}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{totalQuantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{totalAllocated}</td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-2">
                                    {sizes.map((size, index) => (
                                      <div 
                                        key={index}
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                          size.quantity === 0 
                                            ? 'bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400' 
                                            : size.quantity <= size.reorder
                                            ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-400'
                                            : 'bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400'
                                        }`}
                                      >
                                        Size {size.size}: {size.quantity}/{size.allocated}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <div className="flex flex-col gap-1.5">
                                    {outOfStockCount > 0 && (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400">
                                        {outOfStockCount} Out of Stock
                                      </span>
                                    )}
                                    {lowStockCount > 0 && (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-400">
                                        {lowStockCount} Low Stock
                                      </span>
                                    )}
                                    {lowStockCount === 0 && outOfStockCount === 0 && (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400">
                                        All In Stock
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedInventoryAnalysis; 