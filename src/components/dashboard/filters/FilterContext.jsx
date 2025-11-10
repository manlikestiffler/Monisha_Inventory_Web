import { createContext, useContext, useReducer } from 'react';

const FilterContext = createContext();

const initialState = {
  dateRange: '7d',
  school: 'all',
  category: 'all',
  status: 'all',
  search: '',
  sortBy: 'date_desc',
  filters: {},
  appliedFilters: []
};

function filterReducer(state, action) {
  switch (action.type) {
    case 'SET_FILTER':
      return {
        ...state,
        [action.field]: action.value,
        appliedFilters: [...state.appliedFilters, action.field]
      };
    case 'REMOVE_FILTER':
      return {
        ...state,
        [action.field]: initialState[action.field],
        appliedFilters: state.appliedFilters.filter(f => f !== action.field)
      };
    case 'RESET_FILTERS':
      return initialState;
    case 'APPLY_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.filters
        }
      };
    default:
      return state;
  }
}

export function FilterProvider({ children }) {
  const [state, dispatch] = useReducer(filterReducer, initialState);

  return (
    <FilterContext.Provider value={{ state, dispatch }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
} 