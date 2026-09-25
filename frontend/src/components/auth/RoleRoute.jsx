import { Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../../context/AuthContext";

const RoleRoute = ({
  allowedRoles,
  children,
}) => {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      {!allowedRoles.includes(user?.role) ? (
        <Navigate
          to="/unauthorized"
          replace
        />
      ) : (
        children
      )}
    </ProtectedRoute>
  );
};

export default RoleRoute;