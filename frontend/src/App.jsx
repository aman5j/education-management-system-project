import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "./context/AuthContext";

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import Students from "./pages/admin/students/Students";
import AddStudent from "./pages/admin/students/AddStudent";
import EditStudent from "./pages/admin/students/EditStudent";

import Admissions from "./pages/admin/admissions/Admissions";
import AddAdmission from "./pages/admin/admissions/AddAdmission";
import EditAdmission from "./pages/admin/admissions/EditAdmission";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleRoute from "./components/auth/RoleRoute";

import AdminLayout from "./layout/AdminLayout";

import Dashboard from "./pages/admin/Dashboard";

import RoleHome from "./pages/dashboard/RoleHome";

import { ROLES } from "./constants/roles";

const Unauthorized = () => {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f4f7fb",
        fontFamily:
          "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          background: "#ffffff",
          padding: "40px",
          borderRadius: "16px",
          boxShadow:
            "0 10px 35px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1>403</h1>

        <h2>Access Denied</h2>

        <p>
          You do not have permission to access
          this page.
        </p>
      </div>
    </main>
  );
};

const AppRedirect = () => {
  const {
    user,
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (user?.role === ROLES.ADMIN) {
    return (
      <Navigate
        to="/admin/dashboard"
        replace
      />
    );
  }

  if (
    user?.role ===
    ROLES.WEBSITE_EDITOR
  ) {
    return (
      <Navigate
        to="/website-editor/dashboard"
        replace
      />
    );
  }

  if (user?.role === ROLES.STUDENT) {
    return (
      <Navigate
        to="/student/dashboard"
        replace
      />
    );
  }

  return (
    <Navigate
      to="/unauthorized"
      replace
    />
  );
};

const App = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={<AppRedirect />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* <Route
        path="/admin"
        element={
          <RoleRoute
            allowedRoles={[
              ROLES.ADMIN,
            ]}
          >
            <AdminLayout />
          </RoleRoute>
        }
      >
        <Route
          index
          element={
            <Navigate
              to="/admin/dashboard"
              replace
            />
          }
        />

        <Route
          path="dashboard"
          element={<Dashboard />}
        />

        <Route
          path="students"
          element={<Students />}
        />

        <Route
          path="students/add"
          element={<AddStudent />}
        />

        <Route
          path="students/:id/edit"
          element={<EditStudent />}
        />

        {/* <Route
        path="/admin/admissions"
        element={
          <RoleRoute allowedRoles={["admin"]}>
            {/* <AdminLayout /> */}
          {/* </RoleRoute>
        }
      > */} */
        <Route
          // index
           path="admissions"
          element={<Admissions />}
        />

        <Route
          path="add"
          element={<AddAdmission />}
        />

        <Route
          path=":id/edit"
          element={<EditAdmission />}
        />
      {/* </Route> */}
        

        <Route
          path="*"
          element={
            <div
              style={{
                padding: "40px",
                background: "#ffffff",
                borderRadius: "14px",
              }}
            >
              <h2>
                Module coming in a later phase
              </h2>

              <p>
                This navigation item has been
                prepared for the next development
                phase.
              </p>
            </div>
          }
        />
      {/* </Route> */} */

      <Route
        path="/admin"
        element={
          <RoleRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </RoleRoute>
        }
      >
        <Route
          path="dashboard"
          element={<Dashboard />}
        />

        <Route
          path="students"
          element={<Students />}
        />

        <Route
          path="students/add"
          element={<AddStudent />}
        />

        <Route
          path="students/:id/edit"
          element={<EditStudent />}
        />

        <Route
          path="admissions"
          element={<Admissions />}
        />

        <Route
          path="admissions/add"
          element={<AddAdmission />}
        />

        <Route
          path="admissions/:id/edit"
          element={<EditAdmission />}
        />
      </Route>

      <Route
        path="/website-editor/dashboard"
        element={
          <RoleRoute
            allowedRoles={[
              ROLES.WEBSITE_EDITOR,
            ]}
          >
            <RoleHome />
          </RoleRoute>
        }
      />

      <Route
        path="/student/dashboard"
        element={
          <RoleRoute
            allowedRoles={[
              ROLES.STUDENT,
            ]}
          >
            <RoleHome />
          </RoleRoute>
        }
      />

      <Route
        path="/unauthorized"
        element={<Unauthorized />}
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
};

export default App;