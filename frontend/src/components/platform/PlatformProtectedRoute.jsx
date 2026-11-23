
import { Navigate } from "react-router-dom";
import { usePlatformAuth } from "../../context/PlatformAuthContext";

const PlatformProtectedRoute = ({ children }) => {
  const { user, loading, isAuthenticated } =
    usePlatformAuth();

  if (loading) {
    return (
      <div className="platform-screen-loader">
        <div className="platform-spinner" />
        <p>Verifying platform session...</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "super_admin") {
    return <Navigate to="/platform/login" replace />;
  }

  return children;
};

export default PlatformProtectedRoute;
