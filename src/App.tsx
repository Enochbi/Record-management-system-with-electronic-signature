import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import FDPForm from "./components/FDPForm";
import FDPDetail from "./components/FDPDetail";
import Layout from "./components/Layout";
import UserManagement from "./components/UserManagement";

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin protected route component
const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/fdp/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <FDPForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/fdp/edit/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <FDPForm isEditing />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/fdp/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <FDPDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Nouvelle route pour la gestion des utilisateurs */}
          <Route
            path="/admin/users"
            element={
              <AdminProtectedRoute>
                <Layout>
                  <UserManagement />
                </Layout>
              </AdminProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
