import { Routes as RouterRoutes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EmailVerification from './pages/EmailVerification';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import AddProductNew from './pages/AddProductNew';
import ProductDetails from './pages/ProductDetails';
import NewSchools from './pages/NewSchools';
import NewSchoolDetails from './pages/NewSchoolDetails';
import StudentDetailsPage from './pages/StudentDetailsPage';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AdminSuperAdmin from './pages/AdminSuperAdmin';
import PrivateRoute from './components/PrivateRoute';
import { useAuthStore } from './stores/authStore';
import CreateBatch from './pages/CreateBatch';
import BatchInventory from './pages/BatchInventory';
import BatchDetails from './pages/BatchDetails';
import EditBatch from './pages/EditBatch';
import ErrorBoundary from './components/ErrorBoundary';
import UpdateStudentUniformsPage from './pages/UpdateStudentUniformsPage';
import LogUniform from './pages/LogUniform';
import DeficitReportPage from './pages/DeficitReportPage';

function Routes() {
  const { setUser } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, [setUser]);

  return (
    <RouterRoutes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout>
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </Layout>
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Outlet />}>
          <Route index element={<Inventory />} />
          <Route path="add" element={<AddProductNew />} />
         
          <Route path="edit/:id" element={<AddProductNew />} />
          <Route path=":id" element={<ProductDetails />} />
        </Route>
        <Route path="products/*" element={<Navigate to="/inventory" replace />} />
        <Route path="schools" element={<Outlet />}>
          <Route index element={<NewSchools />} />
          <Route path=":id" element={<NewSchoolDetails />} />
          <Route path=":schoolId/students/:studentId" element={<StudentDetailsPage />} />
          <Route path=":schoolId/students/:studentId/details" element={<StudentDetailsPage />} />
        </Route>
        <Route path="batches" element={<BatchInventory />} />
        <Route path="batches/create" element={<CreateBatch />} />
        <Route path="batches/:id" element={<BatchDetails />} />
        <Route path="batches/edit/:id" element={<EditBatch />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="orders/*" element={<Orders />} />
        <Route path="reports/*" element={<Reports />} />
        <Route path="admin/super-admin" element={<AdminSuperAdmin />} />
      </Route>
    </RouterRoutes>
  );
}

export default Routes; 