import { useState, useEffect } from 'react';
import { useFilters } from '../filters/FilterContext';
import { useRealTimeData } from '../../../hooks/useRealTimeData';
import MobileOptimizedChart from '../MobileOptimizedChart';
import InteractiveChart from '../charts/InteractiveChart';
import LoadingSpinner from '../../ui/LoadingSpinner';

const DynamicChart = ({
  initialData,
  endpoint,
  title,
  description,
  metrics,
  formatValue
}) => {
  const { state: filterState } = useFilters();
  const { data, isLoading, error } = useRealTimeData(initialData, endpoint);
  const [filteredData, setFilteredData] = useState(data);

  useEffect(() => {
    // Apply filters to data
    let result = [...data];
    
    if (filterState.dateRange !== 'all') {
      const now = new Date();
      const days = parseInt(filterState.dateRange);
      const cutoff = new Date(now.setDate(now.getDate() - days));
      
      result = result.filter(item => new Date(item.date) >= cutoff);
    }

    if (filterState.school !== 'all') {
      result = result.filter(item => item.schoolId === filterState.school);
    }

    if (filterState.category !== 'all') {
      result = result.filter(item => item.category === filterState.category);
    }

    // Apply sorting
    if (filterState.sortBy) {
      const [field, direction] = filterState.sortBy.split('_');
      result.sort((a, b) => {
        return direction === 'asc' 
          ? a[field] - b[field]
          : b[field] - a[field];
      });
    }

    setFilteredData(result);
  }, [data, filterState]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-600">Error loading data: {error.message}</p>
      </div>
    );
  }

  return (
    <MobileOptimizedChart title={title} description={description}>
      <InteractiveChart
        data={filteredData}
        metrics={metrics}
        formatValue={formatValue}
        title={title}
        description={description}
      />
    </MobileOptimizedChart>
  );
};

export default DynamicChart; 