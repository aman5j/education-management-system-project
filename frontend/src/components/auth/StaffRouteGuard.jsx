
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

const STAFF_ROUTE_PERMISSIONS = [
  [/^\/staff\/dashboard\/?$/, "dashboard.view"],

  [/^\/staff\/students\/?$/, "students.view"],
  [/^\/staff\/students\/add\/?$/, "students.create"],
  [/^\/staff\/students\/[^/]+\/edit\/?$/, "students.update"],
  [/^\/staff\/students\/[^/]+\/payments\/?$/, "payments.view"],

  [/^\/staff\/admissions\/?$/, "admissions.view"],
  [/^\/staff\/admissions\/add\/?$/, "admissions.create"],
  [/^\/staff\/admissions\/[^/]+\/edit\/?$/, "admissions.update"],
  [/^\/staff\/admissions\/[^/]+\/?$/, "admissions.view"],

  [/^\/staff\/courses\/?$/, "courses.view"],
  [/^\/staff\/courses\/add\/?$/, "courses.create"],
  [/^\/staff\/courses\/[^/]+\/edit\/?$/, "courses.update"],
  [/^\/staff\/courses\/[^/]+\/?$/, "courses.view"],

  [/^\/staff\/categories\/?$/, "courses.view"],
  [/^\/staff\/categories\/add\/?$/, "courses.create"],
  [/^\/staff\/categories\/[^/]+\/edit\/?$/, "courses.update"],
  [/^\/staff\/categories\/[^/]+\/?$/, "courses.view"],

  [/^\/staff\/subjects\/?$/, "subjects.view"],
  [/^\/staff\/subjects\/add\/?$/, "subjects.create"],
  [/^\/staff\/subjects\/edit\/[^/]+\/?$/, "subjects.update"],
  [/^\/staff\/subjects\/view\/[^/]+\/?$/, "subjects.view"],
  [/^\/staff\/subjects\/[^/]+\/question-bank\/?$/, "question_bank.view"],

  [/^\/staff\/batches\/?$/, "batches.view"],
  [/^\/staff\/batches\/add\/?$/, "batches.create"],
  [/^\/staff\/batches\/[^/]+\/edit\/?$/, "batches.update"],
  [/^\/staff\/batches\/[^/]+\/?$/, "batches.view"],

  [/^\/staff\/attendance\/?$/, "attendance.view"],

  [/^\/staff\/payments\/?$/, "payments.view"],
  [/^\/staff\/payments\/add\/?$/, "payments.manage"],
  [/^\/staff\/payments\/[^/]+\/edit\/?$/, "payments.manage"],
  [/^\/staff\/payments\/[^/]+\/?$/, "payments.view"],

  [/^\/staff\/expenses\/?$/, "expenses.view"],
  [/^\/staff\/expenses\/add\/?$/, "expenses.manage"],
  [/^\/staff\/expenses\/[^/]+\/edit\/?$/, "expenses.manage"],

  [/^\/staff\/exams\/schedule\/?$/, "exams.view"],
  [/^\/staff\/hall-tickets\/?$/, "exams.view"],
  [/^\/staff\/exams\/results\/?$/, "results.view"],

  [/^\/staff\/reports\/?$/, "reports.view"],
  [/^\/staff\/reports\/payments\/?$/, "reports.view"],
  [/^\/staff\/reports\/students\/?$/, "reports.view"],
  [/^\/staff\/reports\/admissions\/?$/, "reports.view"],
  [/^\/staff\/reports\/courses\/?$/, "reports.view"],
  [/^\/staff\/reports\/batches\/?$/, "reports.view"],
  [/^\/staff\/reports\/fees\/?$/, "reports.view"],
  [/^\/staff\/reports\/expenses\/?$/, "reports.view"],
  [/^\/staff\/reports\/attendance\/?$/, "attendance.view"],
  [/^\/staff\/reports\/pending-fees\/?$/, "reports.view"],

  [/^\/staff\/certificates\/?$/, "certificates.view"],
  [/^\/staff\/communication\/?$/, "settings.manage"],

  [/^\/staff\/website-editor\/?$/, "website.view"],
  [/^\/staff\/pages\/?$/, "website.view"],
  [/^\/staff\/media\/?$/, "website.view"],
  [/^\/staff\/seo\/?$/, "website.view"],

  [/^\/staff\/profile\/?$/, "dashboard.view"],
  [/^\/staff\/notifications\/?$/, "dashboard.view"],
];

const StaffRouteGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="route-loading">
        <p>Checking permissions...</p>
      </div>
    );
  }

  // This guard only applies to the Staff portal.
  if (!location.pathname.startsWith("/staff")) {
    return children;
  }

  if (!user || user.role !== "staff") {
    return <Navigate to="/unauthorized" replace />;
  }

  const assignedRole = user.assignedRole;

  if (!assignedRole || assignedRole.isActive !== true) {
    return <Navigate to="/unauthorized" replace />;
  }

  const routeRule = STAFF_ROUTE_PERMISSIONS.find(([pattern]) =>
    pattern.test(location.pathname)
  );

  // Fail closed: a Staff route without an explicit rule is denied.
  if (!routeRule) {
    return <Navigate to="/unauthorized" replace />;
  }

  const [, requiredPermission] = routeRule;

  if (!hasPermission(user, requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default StaffRouteGuard;
