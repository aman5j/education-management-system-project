import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Checking backend...");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/health`
        );

        if (!response.ok) {
          throw new Error("Backend health check failed");
        }

        const data = await response.json();

        if (data.success) {
          setStatus("Backend API connected successfully");
        }
      } catch (err) {
        console.error(err);
        setError(
          "Backend API is not reachable. Make sure the backend server is running."
        );
      }
    };

    checkBackend();
  }, []);

  return (
    <main className="app-container">
      <section className="app-card">
        <div className="app-icon">EMS</div>

        <h1>Education Management System</h1>

        <p className="subtitle">
          MERN Stack Application
        </p>

        {error ? (
          <div className="status status-error">
            {error}
          </div>
        ) : (
          <div className="status status-success">
            {status}
          </div>
        )}

        <div className="role-container">
          <div className="role-card">
            <strong>Admin</strong>
            <span>Institute Management</span>
          </div>

          <div className="role-card">
            <strong>Website Editor</strong>
            <span>Website Management</span>
          </div>

          <div className="role-card">
            <strong>Student</strong>
            <span>Student Portal</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;