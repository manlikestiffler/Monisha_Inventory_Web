import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from 'recharts';
import Card from '../../ui/Card';

const SchoolComparison = ({ data }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{payload[0].payload.school}</p>
          <div className="mt-2 space-y-1">
            {Object.entries(payload[0].payload)
              .filter(([key]) => key !== 'school')
              .map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="text-gray-600">{key}: </span>
                  <span className="font-medium">{value}</span>
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
          <h2 className="text-xl font-bold text-gray-900">School Performance Comparison</h2>
          <p className="text-sm text-gray-500">Multi-dimensional analysis</p>
        </div>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="Performance"
              dataKey="value"
              stroke="#4F46E5"
              fill="#4F46E5"
              fillOpacity={0.6}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SchoolComparison; 