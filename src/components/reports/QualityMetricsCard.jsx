import { motion } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useThemeDetector } from '../../hooks/useThemeDetector';

const QualityMetricsCard = ({ metrics }) => {
  const isDark = useThemeDetector();
  return (
    <div className="space-y-6">
      {/* Overall Satisfaction */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Satisfaction</h4>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Overall: {metrics.overallSatisfaction}%
          </span>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.satisfactionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgb(156 163 175 / 0.2)" : "rgb(229 231 235)"} />
              <XAxis dataKey="month" stroke={isDark ? "rgb(156 163 175 / 0.7)" : "#6b7280"} />
              <YAxis domain={[0, 100]} stroke={isDark ? "rgb(156 163 175 / 0.7)" : "#6b7280"} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? 'rgb(31 41 55 / 0.8)' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                itemStyle={{ color: isDark ? '#ffffff' : '#1F2937' }}
              />
              <Line
                type="monotone"
                dataKey="satisfaction"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Return Rates */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Return Rates by Category</h4>
        <div className="space-y-4">
          {metrics.returnRates.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{category.name}</span>
                <span className={`text-sm font-medium ${
                  category.rate <= 2 ? 'text-green-600 dark:text-green-400' :
                  category.rate <= 5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {category.rate}%
                </span>
              </div>
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100 dark:bg-gray-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(category.rate * 10, 100)}%` }}
                    transition={{ duration: 0.5 }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                      category.rate <= 2 ? 'bg-green-500' :
                      category.rate <= 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{category.commonIssues.join(', ')}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quality Improvements */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Recent Quality Improvements</h4>
        <div className="space-y-4">
          {metrics.improvements.map((improvement, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{improvement.area}</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {improvement.impact}% improvement
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{improvement.description}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {improvement.affectedCategories.map((category, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs font-medium bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QualityMetricsCard; 