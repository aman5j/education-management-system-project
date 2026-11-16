
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";

import websiteEditorService from "../../../../services/websiteEditorService";
import instituteSettingsService from "../../../../services/instituteSettingsService";
import { getAssetUrl } from "../../../../utils/assetUrl";
import notification, {
  getApiErrorMessage,
} from "../../../../utils/notification";

import WebsitePreview from "./WebsitePreview";
import "../WebsiteEditor.css";
import "../WebsitePreviewPage.css";

const defaultHeader = {
  topbarEnabled: true,
  announcementText: "",
  showTopbarEmail: true,
  showTopbarPhone: true,
  quickLinks: [],
  socialLinks: [],
  showInstituteLogo: true,
  showInstituteName: true,
  showLoginButton: true,
  loginButtonLabel: "Login",
  loginButtonUrl: "/login",
  showEnquiryButton: true,
  enquiryButtonLabel: "Enquire Now",
  enquiryButtonUrl: "/contact",
};

export default function WebsitePreviewPage() {
  const [header, setHeader] = useState(defaultHeader);
  const [institute, setInstitute] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const [headerData, instituteData] = await Promise.all([
          websiteEditorService.getHeaderSettings(),
          instituteSettingsService.getSettings(),
        ]);

        setHeader({
          ...defaultHeader,
          ...(headerData || {}),
        });

        setInstitute(instituteData || {});
      } catch (error) {
        notification.error(
          getApiErrorMessage(error) ||
            "Unable to load the website preview."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, []);

  if (loading) {
    return (
      <div className="we-preview-page-loading">
        <FiRefreshCw className="we-spin" />
        Loading website preview...
      </div>
    );
  }

  const logoUrl = institute.logoUrl
    ? getAssetUrl(institute.logoUrl)
    : "";

  return (
    <div className="we-preview-page">
      <div className="we-preview-page-toolbar">
        <Link to="/admin/website-editor">
          <FiArrowLeft />
          Back to Website Editor
        </Link>

        <span>Saved configuration preview — not published</span>
      </div>

      <main className="we-preview-page-content">
        <WebsitePreview
          header={header}
          institute={institute}
          logoUrl={logoUrl}
        />
      </main>
    </div>
  );
}
