
export const ROLES = Object.freeze({
  ADMIN: "admin",
  STAFF: "staff",
  STUDENT: "student",

  // Temporary compatibility for existing legacy accounts.
  // Do not create new accounts with this role.
  WEBSITE_EDITOR: "website_editor",
});

export const ROLE_HOME_PATHS = Object.freeze({
  [ROLES.ADMIN]: "/admin/dashboard",
  [ROLES.STAFF]: "/staff/dashboard",
  [ROLES.STUDENT]: "/student/dashboard",
});

export const getRoleHomePath = (role) => {
  return ROLE_HOME_PATHS[role] || "/login";
};
