import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '../../ui/Card';
import Select from '../../ui/Select';

const InventoryTrends = ({ data, selectedPeriod, onPeriodChange }) => {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventory Trends</h2>
          <p className="text-sm text-gray-500">Stock level changes over time</p>
        </div>
        <Select
          value={selectedPeriod}
          onChange={onPeriodChange}
          options={[
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
            { value: '90d', label: 'Last 90 days' }
          ]}
          className="w-40"
        />
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
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
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="inStock" 
              stroke="#4F46E5" 
              name="In Stock"
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="allocated" 
              stroke="#10B981" 
              name="Allocated"
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
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-indigo-50 rounded-lg p-4">
          <p className="text-sm text-indigo-600">Current Stock</p>
          <p className="text-2xl font-bold text-indigo-900 mt-1">
            {data[data.length - 1].inStock}
          </p>
          <div className="flex items-center mt-2">
            <span className="text-sm text-indigo-600">
              {((data[data.length - 1].inStock - data[0].inStock) / data[0].inStock * 100).toFixed(1)}% change
            </span>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600">Allocated</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {data[data.length - 1].allocated}
          </p>
          <div className="flex items-center mt-2">
            <span className="text-sm text-green-600">
              {((data[data.length - 1].allocated - data[0].allocated) / data[0].allocated * 100).toFixed(1)}% change
            </span>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <p className="text-sm text-yellow-600">Below Reorder</p>
          <p className="text-2xl font-bold text-yellow-900 mt-1">
            {data[data.length - 1].belowReorder}
          </p>
          <div className="flex items-center mt-2">
            <span className="text-sm text-yellow-600">
              {data[data.length - 1].belowReorderPercentage}% of total
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default InventoryTrends; 