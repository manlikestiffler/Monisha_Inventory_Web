import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import Card from '../../ui/Card';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

const ProductDistribution = ({ data, formatCurrency }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{item.name}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-gray-600">Value: </span>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Share: </span>
              <span className="font-medium">{item.percentage}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${value}%`}
      </text>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Product Distribution</h2>
          <p className="text-sm text-gray-500">Sales distribution by product category</p>
        </div>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={150}
              fill="#8884d8"
              dataKey="percentage"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
        {data.map((item, index) => (
          <div key={item.name} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <p className="text-sm font-medium text-gray-900">{item.name}</p>
            </div>
            <p className="text-lg font-bold text-gray-900 mt-2">
              {formatCurrency(item.value)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {item.percentage}% of total
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ProductDistribution; 