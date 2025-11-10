import { useState, useEffect } from 'react';
import { useSchoolStore } from '../stores/schoolStore';

const SchoolSelect = ({ value, onChange, required }) => {
  const { schools, fetchSchools } = useSchoolStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchools = async () => {
      setLoading(true);
      try {
        await fetchSchools();
      } catch (error) {
        console.error('Error loading schools:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSchools();
  }, [fetchSchools]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full h-12 px-4 rounded-lg bg-[#1F2129] text-white border border-transparent focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 appearance-none pr-10"
      style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%23888888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 1rem center",
        backgroundSize: "12px"
      }}
      required={required}
      disabled={loading}
    >
      <option value="">{loading ? 'Loading schools...' : 'Select School'}</option>
      {schools.map(school => (
        <option key={school.id} value={school.id}>{school.name}</option>
      ))}
    </select>
  );
};

export default SchoolSelect; 