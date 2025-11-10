import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { useThemeDetector } from '../../hooks/useThemeDetector';

const SizeDistributionChart = ({ data, category }) => {
  const isDark = useThemeDetector();
  const chartData = Object.entries(data).map(([size, info]) => ({
    size,
    count: info.count,
    percentage: info.percentage,
    trend: parseFloat(info.trend)
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{category} Size Distribution</h4>
        <div className="flex items-center space-x-4">
          {chartData.map((item) => (
            <motion.div
              key={item.size}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-1"
            >
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.size}</span>
              <span className={`text-xs font-medium ${
                item.trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {item.trend > 0 ? '↑' : '↓'} {Math.abs(item.trend)}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <XAxis dataKey="size" stroke={isDark ? "rgb(156 163 175 / 0.7)" : "#6b7280"} />
          <YAxis stroke={isDark ? "rgb(156 163 175 / 0.7)" : "#6b7280"} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? 'rgb(31 41 55 / 0.8)' : 'white',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            itemStyle={{ color: isDark ? '#ffffff' : '#1F2937' }}
          />
          <Bar
            dataKey="count"
            fill="#4F46E5"
            radius={[4, 4, 0, 0]}
            name="Quantity"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SizeDistributionChart; 