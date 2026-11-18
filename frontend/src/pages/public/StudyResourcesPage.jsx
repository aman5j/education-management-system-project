
import { useEffect, useState } from "react";
import { FiBookOpen, FiLoader, FiRefreshCw } from "react-icons/fi";

import websiteEditorService from "../../services/websiteEditorService";
import { getAssetUrl } from "../../utils/assetUrl";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

import StudyResourcesSection from "../admin/website-editor/components/StudyResourcesSection";
import "../admin/website-editor/StudyResources.phase8.css";

export default function StudyResourcesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadResources = async () => {
    setLoading(true);
    setFailed(false);

    try {
      const resources =
        await websiteEditorService.getPublicStudyResources();

      const normalizedItems = (Array.isArray(resources) ? resources : [])
        .map((item) => ({
          ...item,
          imageUrl: item.imageUrl ? getAssetUrl(item.imageUrl) : "",
        }))
        .sort(
          (a, b) =>
            Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
        );

      setItems(normalizedItems);
    } catch (error) {
      setFailed(true);
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to load Study Resources."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  return (
    <main className="we-study-public-page">
      <header className="we-study-public-header">
        <a href="/" className="we-study-public-brand">
          <FiBookOpen />
          <span>Learning Resources</span>
        </a>

        <a href="/login" className="we-study-public-login">
          Student Login
        </a>
      </header>

      {loading ? (
        <div className="we-study-public-state">
          <FiLoader className="we-study-spin" />
          <span>Loading Study Resources...</span>
        </div>
      ) : failed ? (
        <div className="we-study-public-state">
          <FiBookOpen />
          <strong>Unable to load resources</strong>
          <button type="button" onClick={loadResources}>
            <FiRefreshCw />
            Try Again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="we-study-public-state">
          <FiBookOpen />
          <strong>No Study Resources available yet</strong>
          <span>Please check back later for learning materials.</span>
        </div>
      ) : (
        <StudyResourcesSection items={items} />
      )}

      <footer className="we-study-public-footer">
        Study Resources
      </footer>
    </main>
  );
}
