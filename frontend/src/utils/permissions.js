
export const getUserPermissions = (user) =>
  Array.isArray(user?.assignedRole?.permissions)
    ? user.assignedRole.permissions
    : [];

export const hasPermission = (user, permission) => {
  if (user?.role === "admin") return true;

  const permissions = getUserPermissions(user);

  return (
    permissions.includes("*") ||
    permissions.includes(permission)
  );
};

export const hasAnyPermission = (user, permissions = []) =>
  permissions.some((permission) => hasPermission(user, permission));
