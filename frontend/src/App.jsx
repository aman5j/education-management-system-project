
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "./context/AuthContext";

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import Dashboard from "./pages/admin/Dashboard";
import RoleHome from "./pages/dashboard/RoleHome";

import Students from "./pages/admin/students/Students";
import AddStudent from "./pages/admin/students/AddStudent";
import EditStudent from "./pages/admin/students/EditStudent";

import Admissions from "./pages/admin/admissions/Admissions";
import AddAdmission from "./pages/admin/admissions/AddAdmission";
import EditAdmission from "./pages/admin/admissions/EditAdmission";
import ViewAdmission from "./pages/admin/admissions/ViewAdmission";

import Courses from "./pages/admin/courses/Courses";
import AddCourse from "./pages/admin/courses/AddCourse";
import EditCourse from "./pages/admin/courses/EditCourse";
import ViewCourse from "./pages/admin/courses/ViewCourse";

import Categories from "./pages/admin/categories/Categories";
import AddCategory from "./pages/admin/categories/AddCategory";
import EditCategory from "./pages/admin/categories/EditCategory";
import ViewCategory from "./pages/admin/categories/ViewCategory";

import Batches from "./pages/admin/batches/Batches";
import AddBatch from "./pages/admin/batches/AddBatch";
import EditBatch from "./pages/admin/batches/EditBatch";
import ViewBatch from "./pages/admin/batches/ViewBatch";

import Payments from "./pages/admin/payments/Payments";
import AddPayment from "./pages/admin/payments/AddPayment";
import EditPayment from "./pages/admin/payments/EditPayment";
import ViewPayment from "./pages/admin/payments/ViewPayment";
import StudentPaymentHistory from "./pages/admin/payments/StudentPaymentHistory";

import Reports from "./pages/admin/reports/Reports";
import PaymentReports from "./pages/admin/reports/PaymentReports";
import StudentReports from "./pages/admin/reports/StudentReports";
import AdmissionReports from "./pages/admin/reports/AdmissionReports";
import CourseReports from "./pages/admin/reports/CourseReports";
import BatchReports from "./pages/admin/reports/BatchReports";
import FeeReports from "./pages/admin/reports/FeeReports";
import PendingFeeReports from "./pages/admin/reports/PendingFeeReports";

import Notifications from "./pages/admin/notifications/Notifications";

import SubjectManagement from "./pages/admin/subjects/SubjectManagement";
import AddSubject from "./pages/admin/subjects/AddSubject";
import EditSubject from "./pages/admin/subjects/EditSubject";
import ViewSubject from "./pages/admin/subjects/ViewSubject";

import Attendance from "./pages/admin/attendance/Attendance";


import VerifyReceipt from "./pages/public/VerifyReceipt";

import RoleRoute from "./components/auth/RoleRoute";
import AdminLayout from "./layout/AdminLayout";

import { ROLES } from "./constants/roles";

const Unauthorized = () => (
  <main
    style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "24px",
      background: "#f4f7fb",
      fontFamily: "Inter, Arial, sans-serif",
    }}
  >
    <div
      style={{
        maxWidth: "480px",
        width: "100%",
        textAlign: "center",
        background: "#ffffff",
        padding: "40px 24px",
        borderRadius: "16px",
        boxShadow: "0 10px 35px rgba(15, 23, 42, 0.08)",
      }}
    >
      <h1>403</h1>
      <h2>Access Denied</h2>
      <p>You do not have permission to access this page.</p>
    </div>
  </main>
);

const AppRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  switch (user?.role) {
    case ROLES.ADMIN:
      return <Navigate to="/admin/dashboard" replace />;

    case ROLES.WEBSITE_EDITOR:
      return <Navigate to="/website-editor/dashboard" replace />;

    case ROLES.STUDENT:
      return <Navigate to="/student/dashboard" replace />;

    default:
      return <Navigate to="/unauthorized" replace />;
  }
};

const App = () => {
  return (
    <Routes>
      {/* Application entry */}
      <Route path="/" element={<AppRedirect />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public receipt verification */}
      <Route
        path="/verify-receipt/:receiptNo"
        element={<VerifyReceipt />}
      />
      <Route
        path="/verify-receipt"
        element={<VerifyReceipt />}
      />

      {/* Admin portal */}
      <Route
        path="/admin"
        element={
          <RoleRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminLayout />
          </RoleRoute>
        }
      >
        <Route
          index
          element={<Navigate to="dashboard" replace />}
        />

        {/* Dashboard */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* Student management */}
        <Route path="students" element={<Students />} />
        <Route path="students/add" element={<AddStudent />} />
        <Route path="students/:id/edit" element={<EditStudent />} />

        {/* Admissions */}
        <Route path="admissions" element={<Admissions />} />
        <Route path="admissions/add" element={<AddAdmission />} />
        <Route path="admissions/:id" element={<ViewAdmission />} />
        <Route path="admissions/:id/edit" element={<EditAdmission />} />

        {/* Course management */}
        <Route path="courses" element={<Courses />} />
        <Route path="courses/add" element={<AddCourse />} />
        <Route path="courses/:id" element={<ViewCourse />} />
        <Route path="courses/:id/edit" element={<EditCourse />} />

        {/* Subject management */}
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="subjects/add" element={<AddSubject />} />
        <Route path="subjects/edit/:id" element={<EditSubject />} />
        <Route path="subjects/view/:id" element={<ViewSubject />} />

        {/* Course categories */}
        <Route path="categories" element={<Categories />} />
        <Route path="categories/add" element={<AddCategory />} />
        <Route path="categories/:id" element={<ViewCategory />} />
        <Route path="categories/:id/edit" element={<EditCategory />} />

        {/* Batch management */}
        <Route path="batches" element={<Batches />} />
        <Route path="batches/add" element={<AddBatch />} />
        <Route path="batches/:id" element={<ViewBatch />} />
        <Route path="batches/:id/edit" element={<EditBatch />} />

        {/* Payments */}
        <Route path="payments" element={<Payments />} />
        <Route path="payments/add" element={<AddPayment />} />
        <Route path="payments/:id" element={<ViewPayment />} />
        <Route path="payments/:id/edit" element={<EditPayment />} />
        <Route
          path="students/:studentId/payments"
          element={<StudentPaymentHistory />}
        />

        {/* Reports */}
        <Route path="reports" element={<Reports />} />
        <Route path="reports/payments" element={<PaymentReports />} />
        <Route path="reports/students" element={<StudentReports />} />
        <Route path="reports/admissions" element={<AdmissionReports />} />
        <Route path="reports/courses" element={<CourseReports />} />
        <Route path="reports/batches" element={<BatchReports />} />
        <Route path="reports/fees" element={<FeeReports />} />
        <Route
          path="reports/pending-fees"
          element={<PendingFeeReports />}
        />

        {/* Notifications */}
        <Route path="notifications" element={<Notifications />} />

        {/* Attendance */}
        <Route path="attendance" element={<Attendance />} />

        {/* Unknown admin route */}
        <Route
          path="*"
          element={<Navigate to="/admin/dashboard" replace />}
        />
      </Route>

      {/* Website Editor portal */}
      <Route
        path="/website-editor/dashboard"
        element={
          <RoleRoute allowedRoles={[ROLES.WEBSITE_EDITOR]}>
            <RoleHome />
          </RoleRoute>
        }
      />

      {/* Student portal */}
      <Route
        path="/student/dashboard"
        element={
          <RoleRoute allowedRoles={[ROLES.STUDENT]}>
            <RoleHome />
          </RoleRoute>
        }
      />

      {/* Unauthorized access */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Unknown application route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
