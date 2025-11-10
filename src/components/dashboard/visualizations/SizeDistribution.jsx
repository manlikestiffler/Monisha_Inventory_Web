import { useState } from 'react';
import { ResponsiveContainer, TreeMap, Tooltip } from 'recharts';
import Card from '../../ui/Card';
import Select from '../../ui/Select';

const COLORS = {
  S: '#4F46E5',
  M: '#10B981',
  L: '#F59E0B',
  XL: '#EC4899'
};

const SizeDistribution = ({ data, categories }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{data.name}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-gray-600">Quantity: </span>
              <span className="font-medium">{data.value}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Percentage: </span>
              <span className="font-medium">{data.percentage}%</span>
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
          <h2 className="text-xl font-bold text-gray-900">Size Distribution</h2>
          <p className="text-sm text-gray-500">Stock levels by size</p>
        </div>
        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={[
            { value: 'all', label: 'All Categories' },
            ...categories.map(cat => ({
              value: cat.id,
              label: cat.name
            }))
          ]}
          className="w-48"
        />
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <TreeMap
            data={data}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="#fff"
            fill="#8884d8"
            content={({ root, depth, x, y, width, height, index, payload, colors, rank, name }) => {
              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                      fill: COLORS[name.split(' ')[0]] || '#8884d8',
                      stroke: '#fff',
                      strokeWidth: 2,
                      strokeOpacity: 1 / (depth + 1e-10)
                    }}
                  />
                  {depth === 1 && (
                    <text
                      x={x + width / 2}
                      y={y + height / 2}
                      textAnchor="middle"
                      fill="#fff"
                      className="text-sm font-medium"
                    >
                      {name}
                    </text>
                  )}
                </g>
              );
            }}
          >
            <Tooltip content={<CustomTooltip />} />
          </TreeMap>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SizeDistribution; 