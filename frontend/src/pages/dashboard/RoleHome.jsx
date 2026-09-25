import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getRoleHomePath } from "../../constants/roles";

const RoleHome = () => {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        padding: "40px",
        fontFamily:
          "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow:
            "0 10px 35px rgba(15, 23, 42, 0.08)",
        }}
      >
        <p
          style={{
            color: "#2563eb",
            fontWeight: 700,
          }}
        >
          PHASE 1 RBAC TEST
        </p>

        <h1>
          Welcome, {user?.name}
        </h1>

        <p>
          Authentication is working successfully.
        </p>

        <div
          style={{
            marginTop: "24px",
            padding: "20px",
            background: "#f8fafc",
            borderRadius: "12px",
          }}
        >
          <p>
            <strong>Email:</strong>{" "}
            {user?.email}
          </p>

          <p>
            <strong>Role:</strong>{" "}
            {user?.role}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {user?.status}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "24px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              navigate(
                getRoleHomePath(user?.role)
              )
            }
            style={{
              padding: "11px 18px",
              border: 0,
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            My Dashboard
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: "11px 18px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
};

export default RoleHome;