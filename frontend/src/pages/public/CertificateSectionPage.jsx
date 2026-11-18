
import { useEffect, useState } from "react";
import { FiLoader, FiRefreshCw } from "react-icons/fi";

import websiteEditorService from "../../services/websiteEditorService";
import { getAssetUrl } from "../../utils/assetUrl";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

import CertificateSection from "../admin/website-editor/components/CertificateSection";
import "../admin/website-editor/CertificateSection.phase9.css";

export default function CertificateSectionPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadSection = async () => {
    setLoading(true);
    setFailed(false);

    try {
      const data =
        await websiteEditorService.getPublicCertificateSection();

      setSettings(
        data
          ? {
              ...data,
              imageUrl: data.imageUrl
                ? getAssetUrl(data.imageUrl)
                : "",
            }
          : null
      );
    } catch (error) {
      setFailed(true);

      notification.error(
        getApiErrorMessage(error) ||
          "Unable to load Certificate Section."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSection();
  }, []);

  if (loading) {
    return (
      <div className="we-certificate-public-state">
        <FiLoader className="we-certificate-spin" />
        Loading Certificate Section...
      </div>
    );
  }

  if (failed) {
    return (
      <div className="we-certificate-public-state">
        <strong>Unable to load Certificate Section.</strong>
        <button type="button" onClick={loadSection}>
          <FiRefreshCw />
          Try Again
        </button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="we-certificate-public-state">
        Certificate information is currently unavailable.
      </div>
    );
  }

  return <CertificateSection settings={settings} />;
}
