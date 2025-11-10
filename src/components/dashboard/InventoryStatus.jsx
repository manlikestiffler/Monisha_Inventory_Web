import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Package, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useThemeDetector } from '../../hooks/useThemeDetector';

const InventoryStatus = () => {
  const isDark = useThemeDetector();

  const data = [
    { name: 'In Stock', value: 1250, color: isDark ? '#22c55e' : '#16a34a' },
    { name: 'Low Stock', value: 150, color: isDark ? '#facc15' : '#f59e0b' },
    { name: 'Out of Stock', value: 45, color: isDark ? '#ef4444' : '#dc2626' },
  ];
  const totalItems = data.reduce((sum, d) => sum + d.value, 0);

  const lowStockItems = [
    { id: 1, name: 'Senior Blazer (Size M)', stock: 8, school: 'Greenwood Academy' },
    { id: 2, name: 'Junior Tie', stock: 5, school: 'Washington High' },
    { id: 3, name: 'Summer Skirt (Size S)', stock: 3, school: "St. Mary's" },
  ];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Low Stock':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'Out of Stock':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-full"
    >
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
        <Package className="w-6 h-6 mr-3 text-indigo-500" />
        Inventory Status
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Chart */}
        <div className="relative h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={110}
                innerRadius={70}
                dataKey="value"
                paddingAngle={4}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke={isDark ? '#1f2937' : '#ffffff'} />
                ))}
              </Pie>
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  backgroundColor: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* total in centre */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{totalItems}</p>
            <span className="text-sm text-gray-500 dark:text-gray-400">items</span>
          </div>
        </div>
        {/* custom legend */}
        <div className="mt-4 md:mt-0 flex flex-col gap-3">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{d.name}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{d.value}</span>
            </div>
          ))}
        </div>

        {/* Low Stock Items */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Items Requiring Attention</h3>
          <div className="space-y-4">
            {lowStockItems.map((item) => (
              <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg transition-shadow border-l-4 ${item.stock===0?'border-red-500':item.stock<10?'border-yellow-500':'border-green-500'} bg-gray-50 dark:bg-gray-700/50 hover:shadow-md`}>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {getStatusIcon(item.stock===0?'Out of Stock':item.stock<10?'Low Stock':'In Stock')}
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.school}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-500">{item.stock}</p>
                  <p className="text-xs text-gray-500">in stock</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InventoryStatus; 