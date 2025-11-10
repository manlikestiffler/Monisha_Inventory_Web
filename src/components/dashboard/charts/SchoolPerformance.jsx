import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '../../ui/Card';

const SchoolPerformance = ({ data, formatCurrency }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{label}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-gray-600">Revenue: </span>
              <span className="font-medium">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Orders: </span>
              <span className="font-medium">{payload[1].value}</span>
            </p>
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
          <h2 className="text-xl font-bold text-gray-900">School Performance</h2>
          <p className="text-sm text-gray-500">Revenue and orders by school</p>
        </div>
      </div>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280' }}
              height={60}
              interval={0}
              angle={-45}
              textAnchor="end"
            />
            <YAxis 
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280' }}
              tickFormatter={value => formatCurrency(value)}
              width={80}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280' }}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar yAxisId="left" dataKey="revenue" fill="#4F46E5" name="Revenue" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="orders" fill="#10B981" name="Orders" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SchoolPerformance; 