import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '../../ui/Card';

const StockAnalytics = ({ data, metrics }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{label}</p>
          <div className="mt-2 space-y-1">
            {payload.map((entry, index) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                <span className="text-gray-600">{entry.name}: </span>
                <span className="font-medium">{entry.value}</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Stock Analytics</h2>
          <p className="text-sm text-gray-500">Real-time inventory insights</p>
        </div>
        <div className="flex items-center gap-2">
          {metrics.map(metric => (
            <div 
              key={metric.key}
              className="px-3 py-1 rounded-full text-sm"
              style={{ 
                backgroundColor: `${metric.color}20`,
                color: metric.color 
              }}
            >
              {metric.label}: {metric.value}
            </div>
          ))}
        </div>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280' }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="stock" fill="#4F46E5" name="Current Stock" />
            <Line 
              type="monotone" 
              dataKey="demand" 
              stroke="#10B981" 
              name="Demand Trend"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="reorderLevel"
              stroke="#F59E0B"
              name="Reorder Level"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default StockAnalytics; 