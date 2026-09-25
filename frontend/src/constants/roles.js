export const ROLES = Object.freeze({
  ADMIN: "admin",
  WEBSITE_EDITOR: "website_editor",
  STUDENT: "student",
});

export const ROLE_HOME_PATHS = Object.freeze({
  [ROLES.ADMIN]: "/admin/dashboard",
  [ROLES.WEBSITE_EDITOR]: "/website-editor/dashboard",
  [ROLES.STUDENT]: "/student/dashboard",
});

export const getRoleHomePath = (role) => {
  return ROLE_HOME_PATHS[role] || "/login";
};