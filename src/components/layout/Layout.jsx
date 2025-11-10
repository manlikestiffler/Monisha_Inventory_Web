import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../hooks/useTheme';

const Layout = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [theme] = useTheme();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className={`flex h-screen ${theme}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden dark:bg-black">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background dark:bg-black">
          <div className="min-h-full dark:bg-black">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none dark:hidden">
              <div className="absolute top-[-10%] left-[5%] w-[600px] h-[600px] bg-purple-600/5 rounded-full filter blur-[100px] animate-aurora"></div>
              <div className="absolute top-[20%] right-[5%] w-[500px] h-[500px] bg-blue-600/5 rounded-full filter blur-[100px] animate-aurora animation-delay-2000"></div>
              <div className="absolute bottom-[-10%] left-[35%] w-[800px] h-[400px] bg-teal-600/5 rounded-full filter blur-[100px] animate-aurora animation-delay-4000"></div>
            </div>
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none hidden dark:block">
              <div className="absolute top-[-10%] left-[5%] w-[600px] h-[600px] bg-blue-500/5 rounded-full filter blur-[100px] animate-aurora"></div>
              <div className="absolute top-[20%] right-[5%] w-[500px] h-[500px] bg-purple-500/5 rounded-full filter blur-[100px] animate-aurora animation-delay-2000"></div>
              <div className="absolute bottom-[-10%] left-[35%] w-[800px] h-[400px] bg-indigo-500/5 rounded-full filter blur-[100px] animate-aurora animation-delay-4000"></div>
            </div>
            <div className="relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="min-h-screen px-4 py-8 sm:px-6 lg:px-8"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;