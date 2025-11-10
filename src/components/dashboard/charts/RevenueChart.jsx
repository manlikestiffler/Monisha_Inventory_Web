import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Card from '../../ui/Card';
import Button from '../../ui/Button';

const RevenueChart = ({ data, selectedMetric, onMetricChange, formatCurrency }) => {
  const metrics = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'orders', label: 'Orders' },
    { key: 'profit', label: 'Profit' }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600 mt-1">
            {selectedMetric === 'orders' 
              ? `${payload[0].value} orders`
              : formatCurrency(payload[0].value)
            }
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Revenue Analytics</h2>
          <p className="text-sm text-gray-500">Monthly performance breakdown</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {metrics.map(metric => (
            <Button
              key={metric.key}
              variant={selectedMetric === metric.key ? 'solid' : 'outline'}
              onClick={() => onMetricChange(metric.key)}
              className="capitalize"
            >
              {metric.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280' }}
              tickFormatter={value => 
                selectedMetric === 'orders' 
                  ? value
                  : formatCurrency(value)
              }
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke="#4F46E5"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMetric)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-6">
        {metrics.map(metric => {
          const total = data.reduce((sum, item) => sum + item[metric.key], 0);
          const lastMonth = data[data.length - 1][metric.key];
          const prevMonth = data[data.length - 2][metric.key];
          const growth = ((lastMonth - prevMonth) / prevMonth) * 100;

          return (
            <div key={metric.key} className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">{metric.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {metric.key === 'orders' 
                  ? total.toLocaleString()
                  : formatCurrency(total)
                }
              </p>
              <div className="flex items-center mt-2">
                <span className={`text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 ml-2">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default RevenueChart; 