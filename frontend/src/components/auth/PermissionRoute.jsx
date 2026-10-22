
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
import ProtectedRoute from "./ProtectedRoute";

const PermissionRoute = ({ permission, children }) => {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      {hasPermission(user, permission) ? (
        children
      ) : (
        <Navigate to="/unauthorized" replace />
      )}
    </ProtectedRoute>
  );
};

export default PermissionRoute;
