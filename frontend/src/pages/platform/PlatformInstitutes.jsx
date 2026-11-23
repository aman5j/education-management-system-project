
import { FiDatabase, FiPlus, FiClock } from "react-icons/fi";

const PlatformInstitutes = () => {
  return (
    <div className="platform-page">
      <div className="platform-page-heading">
        <div>
          <span className="platform-eyebrow">
            PLATFORM MANAGEMENT
          </span>

          <h1>Institute Management</h1>

          <p>
            Manage and register institutes on your EMS platform.
          </p>
        </div>
      </div>

      <section className="platform-coming-soon">
        <div className="platform-coming-icon">
          <FiDatabase />
        </div>

        <span className="platform-coming-badge">
          PHASE 2
        </span>

        <h2>Institute Management is coming next</h2>

        <p>
          The institute registry model is ready. In Phase 2,
          we will build institute registration, listing,
          editing, status management and secure APIs.
        </p>

        <div className="platform-coming-features">
          <span><FiPlus /> Register institute</span>
          <span><FiDatabase /> Database details</span>
          <span><FiClock /> Provisioning status</span>
        </div>
      </section>
    </div>
  );
};

export default PlatformInstitutes;
