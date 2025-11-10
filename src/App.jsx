import { BrowserRouter } from 'react-router-dom';
import Routes from './Routes';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';
import { useAuthStore } from './stores/authStore';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

function App() {
  const { setUser, fetchUserProfile, authLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('🔐 Auth state changed - user logged in:', user.uid);
        setUser(user);
        await fetchUserProfile(user.uid);
      } else {
        console.log('🔐 Auth state changed - user logged out');
        // The setUser(null) call now handles resetting auth state including authLoading
        setUser(null);
      }
    });

    return () => unsubscribe();
    // authLoading is not needed in dependency array as it's a result of this effect
  }, [setUser, fetchUserProfile]);

  // Display a global loading spinner during the initial auth check
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#111',
        color: 'white'
      }}>
        <p>Loading...</p> {/* Replace with a proper spinner component if available */}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
