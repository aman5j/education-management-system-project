
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
import "../StudyResources.phase8.css";
import "../CertificateSection.phase9.css";
import "../Partners.phase10.css";
import "../PlacementStories.phase11.css";
import "../OurTeam.phase12.css";
import "../FreeVideos.phase13.css";
import "../Careers.phase14.css";


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
  const [studyResources, setStudyResources] = useState([]);
  const [certificateSection, setCertificateSection] = useState(null);
  const [partners, setPartners] = useState(null);
  const [placementStories, setPlacementStories] = useState(null);
  const [team, setTeam] = useState(null);
  const [freeVideos, setFreeVideos] = useState(null);
  const [careers, setCareers] = useState(null);


  useEffect(() => {
    const loadPreview = async () => {
      try {
        const [
            headerData,
            instituteData,
            studyResourceData,
            certificateSectionData,
            partnerData,
            placementStoriesData,
            teamData,
            freeVideoData,
            careerData,
            ] = await Promise.all([
            websiteEditorService.getHeaderSettings(),
            instituteSettingsService.getSettings(),
            websiteEditorService.getPublicStudyResources(),
            websiteEditorService.getPublicCertificateSection(),
            websiteEditorService.getPublicPartnerSettings(),
            websiteEditorService.getPublicPlacementStories(),
            websiteEditorService.getPublicTeamSettings(),
            websiteEditorService.getPublicFreeVideos(),
            websiteEditorService.getPublicCareerSettings(),
        ]);

        setHeader({
          ...defaultHeader,
          ...(headerData || {}),
        });

        setInstitute(instituteData || {});

        setStudyResources(
        (Array.isArray(studyResourceData) ? studyResourceData : []).map(
            (item) => ({
            ...item,
            imageUrl: item.imageUrl
                ? getAssetUrl(item.imageUrl)
                : "",
            })
        )
        );

        setCertificateSection(
        certificateSectionData
            ? {
                ...certificateSectionData,
                imageUrl: certificateSectionData.imageUrl
                ? getAssetUrl(certificateSectionData.imageUrl)
                : "",
            }
            : null
        );


        // Phase 10: Load saved Partners
        setPartners(
          partnerData
            ? {
                ...partnerData,
                logos: (partnerData.logos || []).map((logo) => ({
                  ...logo,
                  imageUrl: logo.imageUrl
                    ? getAssetUrl(logo.imageUrl)
                    : "",
                })),
              }
            : null
        );

        // Phase 11: Load saved Placement Stories
        setPlacementStories(
          placementStoriesData
            ? {
                ...placementStoriesData,
                stories: (placementStoriesData.stories || []).map(
                  (story, index) => ({
                    ...story,
                    displayOrder: index,
                    imageUrl: story.imageUrl
                      ? getAssetUrl(story.imageUrl)
                      : "",
                  })
                ),
              }
            : null
        );

        // Phase 12: Load saved Our Team
        setTeam(
          teamData
            ? {
                ...teamData,
                members: (teamData.members || []).map(
                  (member, index) => ({
                    ...member,
                    displayOrder: index,
                    imageUrl: member.imageUrl
                      ? getAssetUrl(member.imageUrl)
                      : "",
                  })
                ),
              }
            : null
        );

        // Phase 13: Load saved Free Videos
        setFreeVideos(
          freeVideoData
            ? {
                ...freeVideoData,
                videos: (freeVideoData.videos || []).map(
                  (video, index) => ({
                    ...video,
                    displayOrder: index,
                  })
                ),
              }
            : null
        );

        // Phase 14: Load Careers
        setCareers(
          careerData
            ? {
                ...careerData,
                jobs: (careerData.jobs || []).map((job, index) => ({
                  ...job,
                  displayOrder: index,
                  skills: Array.isArray(job.skills) ? job.skills : [],
                })),
              }
            : null
        );

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
          studyResources={studyResources}
          certificateSection={certificateSection}
          partners={partners}
          placementStories={placementStories}
          team={team}
          freeVideos={freeVideos}
          careers={careers}
        />
      </main>
    </div>
  );
}
