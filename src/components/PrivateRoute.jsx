import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuthStore } from '../stores/authStore';

const PrivateRoute = ({ children }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PrivateRoute; 