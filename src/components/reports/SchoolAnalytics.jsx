import { motion } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B'];

const SchoolAnalytics = ({ schoolData }) => {
  const gradeData = Object.entries(schoolData.gradeDistribution).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{schoolData.name}</h3>
          <p className="text-sm text-gray-500">Total Students: {schoolData.studentCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Size Preferences */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Size Preferences</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">Most Common Shirt Size</span>
                <div className="text-lg font-medium text-gray-900">
                  Size {schoolData.preferences.shirts.topSize}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">Percentage</span>
                <div className="text-lg font-medium text-blue-600">
                  {schoolData.preferences.shirts.percentage}%
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">Most Common Trouser Size</span>
                <div className="text-lg font-medium text-gray-900">
                  Size {schoolData.preferences.trousers.topSize}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">Percentage</span>
                <div className="text-lg font-medium text-blue-600">
                  {schoolData.preferences.trousers.percentage}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Grade Distribution</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {gradeData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`${value}%`, 'Percentage']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {gradeData.map((item, index) => (
              <div key={item.name} className="text-center">
                <div className="text-xs font-medium text-gray-500">{item.name}</div>
                <div className="text-sm font-medium" style={{ color: COLORS[index] }}>
                  {item.value}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SchoolAnalytics; 