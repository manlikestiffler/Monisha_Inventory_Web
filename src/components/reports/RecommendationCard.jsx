import { motion } from 'framer-motion';

const RecommendationCard = ({ recommendations }) => {
  return (
    <div className="space-y-6">
      {/* Inventory Recommendations */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-400 mb-4">Stock Recommendations</h4>
        <div className="space-y-4">
          {recommendations.inventory.map((category) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900 dark:text-gray-100">{category.category}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  category.trend === 'increasing' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                }`}>
                  {category.trend.charAt(0).toUpperCase() + category.trend.slice(1)}
                </span>
              </div>
              <div className="space-y-3">
                {category.sizes.map((size) => (
                  <div key={size.size} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Size {size.size}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{size.reason}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {size.suggestedStock} units
                      </div>
                      <div className={`text-xs ${
                        size.suggestedStock > size.currentStock
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {size.suggestedStock > size.currentStock ? '+' : ''}
                        {size.suggestedStock - size.currentStock} needed
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Restock Priorities */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-400 mb-4">Restock Priorities</h4>
        <div className="space-y-3">
          {recommendations.restockPriority.map((item) => (
            <motion.div
              key={item.item}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.item}</span>
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                  item.priority === 'High'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                }`}>
                  {item.priority}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Deficit: {item.deficit} units
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard; 