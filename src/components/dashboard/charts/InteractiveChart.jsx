import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ReferenceArea
} from 'recharts';
import Button from '../../ui/Button';

const InteractiveChart = ({ 
  data, 
  metrics, 
  formatValue, 
  title, 
  description 
}) => {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedData, setZoomedData] = useState(data);

  const getAxisYDomain = useCallback((from, to, ref, offset) => {
    const refData = data.slice(from - 1, to);
    let [bottom, top] = [refData[0][ref], refData[0][ref]];
    
    refData.forEach((d) => {
      if (d[ref] > top) top = d[ref];
      if (d[ref] < bottom) bottom = d[ref];
    });
    
    return [(bottom | 0) - offset, (top | 0) + offset];
  }, [data]);

  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    let left = refAreaLeft;
    let right = refAreaRight;

    if (refAreaLeft > refAreaRight) {
      left = refAreaRight;
      right = refAreaLeft;
    }

    const zoomed = data.slice(
      data.findIndex(item => item.name === left),
      data.findIndex(item => item.name === right) + 1
    );

    setZoomedData(zoomed);
    setRefAreaLeft('');
    setRefAreaRight('');
    setIsZoomed(true);
  };

  const resetZoom = () => {
    setZoomedData(data);
    setIsZoomed(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {isZoomed && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
              className="flex items-center"
            >
              <svg 
                className="w-4 h-4 mr-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Zoom
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Export chart data
            }}
          >
            <svg 
              className="w-4 h-4 mr-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </Button>
        </div>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={zoomedData}
            onMouseDown={e => e && setRefAreaLeft(e.activeLabel)}
            onMouseMove={e => e && refAreaLeft && setRefAreaRight(e.activeLabel)}
            onMouseUp={zoom}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis 
              dataKey="name" 
              allowDataOverflow={true}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280' }}
              tickFormatter={formatValue}
              width={80}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
                      <p className="font-medium text-gray-900">{label}</p>
                      <div className="mt-2 space-y-1">
                        {payload.map((entry, index) => (
                          <p key={index} className="text-sm" style={{ color: entry.color }}>
                            <span className="text-gray-600">{entry.name}: </span>
                            <span className="font-medium">
                              {formatValue(entry.value)}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Brush dataKey="name" height={30} stroke="#8884d8" />
            {metrics.map((metric, index) => (
              metric.type === 'bar' ? (
                <Bar
                  key={metric.key}
                  dataKey={metric.key}
                  fill={metric.color}
                  name={metric.label}
                  radius={[4, 4, 0, 0]}
                />
              ) : (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  name={metric.label}
                  strokeWidth={2}
                  dot={false}
                />
              )
            ))}
            {refAreaLeft && refAreaRight && (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                strokeOpacity={0.3}
                fill="#8884d8"
                fillOpacity={0.3}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
        {metrics.map(metric => {
          const currentValue = zoomedData[zoomedData.length - 1][metric.key];
          const previousValue = zoomedData[zoomedData.length - 2][metric.key];
          const change = ((currentValue - previousValue) / previousValue) * 100;

          return (
            <div 
              key={metric.key}
              className="bg-gray-50 rounded-lg p-4"
              style={{ borderLeft: `4px solid ${metric.color}` }}
            >
              <p className="text-sm text-gray-600">{metric.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {formatValue(currentValue)}
              </p>
              <div className="flex items-center mt-2">
                <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 ml-2">vs previous</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InteractiveChart; 