
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiRefreshCw } from "react-icons/fi";

import websiteEditorService from "../../services/websiteEditorService";
import instituteSettingsService from "../../services/instituteSettingsService";
import contactUsService from "../../services/contactUsService";

import { getAssetUrl } from "../../utils/assetUrl";

import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

import WebsitePreview from "../admin/website-editor/components/WebsitePreview";

import "../admin/website-editor/WebsiteEditor.css";
import "../admin/website-editor/WebsitePreviewPage.css";
import "../admin/website-editor/StudyResources.phase8.css";
import "../admin/website-editor/CertificateSection.phase9.css";
import "../admin/website-editor/Partners.phase10.css";
import "../admin/website-editor/PlacementStories.phase11.css";
import "../admin/website-editor/OurTeam.phase12.css";
import "../admin/website-editor/FreeVideos.phase13.css";
import "../admin/website-editor/Careers.phase14.css";
import "../admin/website-editor/Testimonials.phase15.css";
import "../admin/website-editor/ContactUs.phase16.css";

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

const asset = (value) => (
  value ? getAssetUrl(value) : ""
);

export default function WebsitePage() {
  const location = useLocation();

  const [loading, setLoading] = useState(true);

  const [header, setHeader] = useState(defaultHeader);
  const [institute, setInstitute] = useState({});
  const [logoUrl, setLogoUrl] = useState("");

  const [menu, setMenu] = useState({ items: [] });
  const [banner, setBanner] = useState([]);

  const [categoryHighlights, setCategoryHighlights] = useState([]);
  const [courseCategories, setCourseCategories] = useState([]);
  const [trendingCourses, setTrendingCourses] = useState([]);

  const [studyResources, setStudyResources] = useState([]);
  const [certificateSection, setCertificateSection] = useState(null);
  const [partners, setPartners] = useState(null);
  const [placementStories, setPlacementStories] = useState(null);
  const [team, setTeam] = useState(null);
  const [freeVideos, setFreeVideos] = useState(null);
  const [careers, setCareers] = useState(null);
  const [testimonials, setTestimonials] = useState(null);

  const [contactUs, setContactUs] = useState(null);
  const [contactCourses, setContactCourses] = useState([]);

  // Phase 17: Footer
  const [footerSettings, setFooterSettings] = useState({});

  useEffect(() => {
    let active = true;

    const loadWebsite = async () => {
      try {
        const [
          headerData,
          menuData,
          bannerData,
          brandingData,
          categoryHighlightData,
          courseCategoryData,
          trendingCourseData,
          studyResourceData,
          certificateData,
          partnerData,
          placementData,
          teamData,
          freeVideoData,
          careerData,
          testimonialData,
          contactData,
          footerData,
        ] = await Promise.all([
          websiteEditorService.getPublicHeaderSettings(),
          websiteEditorService.getPublicMenuSettings(),
          websiteEditorService.getPublicBannerSettings(),

          instituteSettingsService.getPublicBranding(),

          websiteEditorService.getCategoryHighlights(),
          websiteEditorService.getPublicCourseCategories(),
          websiteEditorService.getPublicTrendingCourses(),

          websiteEditorService.getPublicStudyResources(),
          websiteEditorService.getPublicCertificateSection(),
          websiteEditorService.getPublicPartnerSettings(),
          websiteEditorService.getPublicPlacementStories(),
          websiteEditorService.getPublicTeamSettings(),
          websiteEditorService.getPublicFreeVideos(),
          websiteEditorService.getPublicCareerSettings(),
          websiteEditorService.getPublicTestimonialSettings(),

          contactUsService.getPublicContactData(),
          websiteEditorService.getPublicFooterSettings(),
        ]);

        if (!active) return;

        const instituteData = {
        ...(contactData?.contact || {}),
        ...(footerData?.institute || {}),
        logoUrl:
            brandingData?.logoUrl ||
            footerData?.institute?.logoUrl ||
            "",
        };

        setHeader({
          ...defaultHeader,
          ...(headerData || {}),
        });

        setInstitute(instituteData);
        setLogoUrl(
            asset(
                brandingData?.logoUrl ||
                footerData?.institute?.logoUrl
            )
        );

        setMenu(
          menuData || { items: [] }
        );

        setBanner(
          (bannerData?.slides || []).map((slide) => ({
            ...slide,
            imageUrl: asset(slide.imageUrl),
          }))
        );

        setCategoryHighlights(
          (categoryHighlightData?.items || []).map((item) => ({
            ...item,
            iconUrl: asset(item.iconUrl),
          }))
        );

        setCourseCategories(
          (Array.isArray(courseCategoryData)
            ? courseCategoryData
            : []
          ).map((category) => ({
            ...category,
            categoryIcon: asset(category.categoryIcon),
          }))
        );

        setTrendingCourses(
          (Array.isArray(trendingCourseData)
            ? trendingCourseData
            : []
          ).map((course) => ({
            ...course,
            courseImage: asset(course.courseImage),
          }))
        );

        setStudyResources(
          (Array.isArray(studyResourceData)
            ? studyResourceData
            : []
          ).map((item) => ({
            ...item,
            imageUrl: asset(item.imageUrl),
          }))
        );

        setCertificateSection(
          certificateData
            ? {
                ...certificateData,
                imageUrl: asset(certificateData.imageUrl),
              }
            : null
        );

        setPartners(
          partnerData
            ? {
                ...partnerData,
                logos: (partnerData.logos || []).map((logo) => ({
                  ...logo,
                  imageUrl: asset(logo.imageUrl),
                })),
              }
            : null
        );

        setPlacementStories(
          placementData
            ? {
                ...placementData,
                stories: (placementData.stories || []).map(
                  (story, index) => ({
                    ...story,
                    displayOrder: index,
                    imageUrl: asset(story.imageUrl),
                  })
                ),
              }
            : null
        );

        setTeam(
          teamData
            ? {
                ...teamData,
                members: (teamData.members || []).map(
                  (member, index) => ({
                    ...member,
                    displayOrder: index,
                    imageUrl: asset(member.imageUrl),
                  })
                ),
              }
            : null
        );

        setFreeVideos(freeVideoData || null);

        setCareers(
          careerData
            ? {
                ...careerData,
                jobs: (careerData.jobs || []).map(
                  (job, index) => ({
                    ...job,
                    displayOrder: index,
                    skills: Array.isArray(job.skills)
                      ? job.skills
                      : [],
                  })
                ),
              }
            : null
        );

        setTestimonials(
          testimonialData
            ? {
                ...testimonialData,
                testimonials: (
                  testimonialData.testimonials || []
                ).map((item, index) => ({
                  ...item,
                  displayOrder: index,
                  imageUrl: asset(item.imageUrl),
                })),
              }
            : null
        );

        setContactUs(contactData?.settings || {});
        setContactCourses(
          Array.isArray(contactData?.courses)
            ? contactData.courses
            : []
        );

        // Phase 17: Public Footer settings
        setFooterSettings(footerData?.settings || {});
      } catch (error) {
        if (active) {
          notification.error(
            getApiErrorMessage(error) ||
              "Unable to load the institute website."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadWebsite();

    return () => {
      active = false;
    };
  }, []);

  // When /contact redirects to /website#contact,
  // scroll after the website sections have loaded.
  useEffect(() => {
    if (!loading && location.hash === "#contact") {
      document.getElementById("contact")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [loading, location.hash]);

  if (loading) {
    return (
      <div className="we-public-website-loading">
        <FiRefreshCw className="we-spin" />
        <span>Loading website...</span>
      </div>
    );
  }

  return (
    <main className="we-public-website">
      <WebsitePreview
        header={header}
        institute={institute}
        logoUrl={logoUrl}
        menu={menu}
        banner={banner}
        categoryHighlights={categoryHighlights}
        courseCategories={courseCategories}
        trendingCourses={trendingCourses}
        studyResources={studyResources}
        certificateSection={certificateSection}
        partners={partners}
        placementStories={placementStories}
        team={team}
        freeVideos={freeVideos}
        careers={careers}
        testimonials={testimonials}
        contactUs={contactUs}
        contact={institute}
        contactCourses={contactCourses}
        footerSettings={footerSettings}
        interactiveContact
        publicSite
        showPreviewPlaceholder={false}
      />
    </main>
  );
}
