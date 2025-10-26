import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AIAssistant } from './components/layout/AIAssistant';
import { ToastContainer } from './components/ui/Toast';
import { useToast } from './hooks/useToast';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Home } from './pages/Home';
import { Generate } from './pages/Generate';
import { Dashboard } from './pages/Dashboard';
import { Marketplace } from './pages/Marketplace';
import { APIKeys } from './pages/APIKeys';
import { Profile } from './pages/Profile';
import { Feedback } from './pages/Feedback';
import { Billing } from './pages/Billing';
import Monitoring from './pages/Monitoring';
import IntegrationHelper from './pages/IntegrationHelper';
import { Admin } from './pages/Admin';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toasts, removeToast } = useToast();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar onLogout={signOut} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          theme={theme}
          toggleTheme={toggleTheme}
          userEmail={profile?.email}
          userPlan={profile?.plan}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <AIAssistant />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/landing"
        element={<Landing />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" /> : <Login />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard" /> : <Signup />}
      />
      <Route
        path="/"
        element={
          user ? (
            <ProtectedRoute>
              <MainLayout>
                <Home />
              </MainLayout>
            </ProtectedRoute>
          ) : (
            <Landing />
          )
        }
      />
      <Route
        path="/generate"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Generate />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketplace"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Marketplace />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/api-keys"
        element={
          <ProtectedRoute>
            <MainLayout>
              <APIKeys />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Profile />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/feedback"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Feedback />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Billing />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitoring"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Monitoring />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/integration-helper"
        element={
          <ProtectedRoute>
            <MainLayout>
              <IntegrationHelper />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Admin />
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
