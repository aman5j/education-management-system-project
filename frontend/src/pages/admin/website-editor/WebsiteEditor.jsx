
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiGlobe,
  FiChevronDown,
  FiChevronUp,
  FiLayout,
  FiMenu,
  FiImage,
  FiGrid,
  FiBookOpen,
  FiAward,
  FiUsers,
  FiBriefcase,
  FiVideo,
  FiMessageSquare,
  FiPhone,
  FiLayers,
  FiSettings,
  FiMonitor,
  FiTablet,
  FiSmartphone,
  FiSave,
  FiX,
  FiLock,
  FiRefreshCw,
  FiExternalLink,
} from "react-icons/fi";

import websiteEditorService from "../../../services/websiteEditorService";
import instituteSettingsService from "../../../services/instituteSettingsService";
import MenuControls from "./components/MenuControls";
import BannerControls from "./components/BannerControls";
import CategoryHighlightsControls from "./components/CategoryHighlightsControls";
import CourseCategoriesControls from "./components/CourseCategoriesControls";
import TrendingCoursesControls from "./components/TrendingCoursesControls";
import StudyResourcesControls from "./components/StudyResourcesControls";
import "./StudyResources.phase8.css";
import CertificateSectionControls from "./components/CertificateSectionControls";
import "./CertificateSection.phase9.css";
import PartnersControls from "./components/PartnersControls";
import "./Partners.phase10.css";
import PlacementStoriesControls from "./components/PlacementStoriesControls";
import "./PlacementStories.phase11.css";
import OurTeamControls from "./components/OurTeamControls";
import "./OurTeam.phase12.css";
import FreeVideosControls from "./components/FreeVideosControls";
import "./FreeVideos.phase13.css";
import CareersControls from "./components/CareersControls";
import "./Careers.phase14.css";
import TestimonialsControls from "./components/TestimonialsControls";
import "./Testimonials.phase15.css";
import ContactUsControls from "./components/ContactUsControls";
import contactUsService from "../../../services/contactUsService";
import "./ContactUs.phase16.css";
import FooterControls from "./components/FooterControls";
import "./Footer.phase17.css";


import { getAssetUrl } from "../../../utils/assetUrl";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import HeaderControls from "./components/HeaderControls";
import WebsitePreview from "./components/WebsitePreview";

import "./WebsiteEditor.css";


const initialHeader = {
  topbarEnabled: true,
  announcementText: "",
  showTopbarEmail: true,
  showTopbarPhone: true,
  quickLinks: [],
  socialLinks: [],
  showInstituteLogo: true,
  showInstituteName: true,

  // ===== START: DEFAULT HEADER BUTTON LABELS =====
  showLoginButton: true,
  loginButtonLabel: "Login/Register",
  loginButtonUrl: "/login",

  showEnquiryButton: true,
  enquiryButtonLabel: "Book Free Demo",
  enquiryButtonUrl: "/contact",
  // ===== END: DEFAULT HEADER BUTTON LABELS =====
};


const initialInstitute = {
  instituteName: "",
  logoUrl: "",
  email: "",
  phone: "",
  alternatePhone: "",
  website: "",
  address: "",
};

const initialBanner = {
  slides: [],
};

const initialCategoryHighlights = {
  items: [],
};

// !!!!! INSERTION START: PHASE 6 COURSE CATEGORIES INITIAL STATE !!!!!
const initialCourseCategories = {
  selectedCategoryIds: [],
};
// !!!!! INSERTION END: PHASE 6 COURSE CATEGORIES INITIAL STATE !!!!!


const initialTrendingCourses = {
  selectedCourseIds: [],
};

const initialStudyResources = {
  items: [],
};

const initialCertificateSection = {
  enabled: false,
  imageUrl: "",
  imageVersion: "",
  title: "",
  highlightText: "",
  description: "",
  listItems: [],
  buttonText: "View Full Certificate",
  buttonAction: "image",
  externalUrl: "",
};


// Phase 10: Partners
const initialPartners = {
  enabled: true,
  heading:
    "Trusted by industry leaders and valued partners worldwide",
  highlightText: "industry leaders and valued partners",
  visibleCount: 5,
  autoSlide: true,
  logos: [],
};


// Phase 11: Placement Stories
const initialPlacementStories = {
  enabled: true,
  heading: "Our Success Placement Story",
  highlightText: "Placement Story",
  stories: [],
};


// Phase 12: Our Team
const initialTeam = {
  enabled: true,
  heading: "Our Team",
  highlightText: "Team",
  description:
    "We craft solutions that amplify key characteristics, achieving a harmonious balance of function and intent. Through careful analysis and collaborative engagement, our spaces transcend the conventional.",
  members: [],
};

// Phase 13: Free Videos
const initialFreeVideos = {
  enabled: true,
  heading: "Free Videos",
  highlightText: "Videos",
  description:
    "Watch our most popular and high-quality free videos to boost your learning journey.",
  videos: [],
};


// Phase 14: Careers
const initialCareers = {
  enabled: true,
  heading: "Join Our Growing Team",
  highlightText: "Team",
  description:
    "Explore exciting career opportunities and be part of the team that's revolutionizing education technology.",
  jobs: [],
};


// Phase 15: Testimonials
const initialTestimonials = {
  enabled: true,
  sectionLabel: "Testimonials",
  heading: "What Our Students Say",
  highlightText: "Students Say",
  description:
    "Hear from our students about their learning experience and journey with us.",
  testimonials: [],
};

const initialContactUs = {
  enabled: true,
  heading: "Get in Touch",
  description:
    "Have a question about a batch, test series or books? Send us a message and our team will help you choose the right preparation path.",
};


const initialFooterSettings = {
  instituteDescription:
    "Empowering learners with industry-relevant courses, practical training and career support to build a successful future.",
  columnOneHeading: "Useful Links",
  columnOneLinks: [],
  columnTwoHeading: "Our Company",
  columnTwoLinks: [],
  columnThreeHeading: "Get in Touch",
};



const editorSections = [
  { id: "header", label: "Header", phase: 2, icon: FiLayout },
  { id: "menu", label: "Menu", phase: 3, icon: FiMenu },
  { id: "banner", label: "Banner", phase: 4, icon: FiImage },
  { id: "categories", label: "Category Highlights", phase: 5, icon: FiGrid },
  { id: "coursescategory", label: "Course Categories", phase: 6, icon: FiImage },
  { id: "courses", label: "Trending Courses", phase: 7, icon: FiBookOpen },
  { id: "resources", label: "Study Resources", phase: 8, icon: FiLayers },
  { id: "certificate", label: "Certificate Section", phase: 9, icon: FiAward },
  { id: "partners", label: "Partners", phase: 10, icon: FiBriefcase },
  { id: "placements", label: "Placement Stories", phase: 11, icon: FiUsers },
  { id: "team", label: "Our Team", phase: 12, icon: FiUsers },
  { id: "videos", label: "Free Videos", phase: 13, icon: FiVideo },
  { id: "careers", label: "Careers", phase: 14, icon: FiBriefcase },
  { id: "testimonials", label: "Testimonials", phase: 15, icon: FiMessageSquare },
  { id: "contact", label: "Contact Us", phase: 16, icon: FiPhone },
  { id: "footer", label: "Footer", phase: 17, icon: FiLayers },
  { id: "pages", label: "Pages Management", phase: 18, icon: FiGlobe },
  { id: "media", label: "Media Library", phase: 19, icon: FiImage },
  { id: "seo", label: "SEO Settings", phase: 20, icon: FiSettings },
];

const WebsiteEditor = () => {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("header");
  const [expandedSection, setExpandedSection] = useState("header");
  const [previewDevice, setPreviewDevice] = useState("desktop");

  const [header, setHeader] = useState(initialHeader);
  const [savedHeader, setSavedHeader] = useState(initialHeader);

  const [institute, setInstitute] = useState(initialInstitute);
  const [savedInstitute, setSavedInstitute] = useState(initialInstitute);

  // !!!!! INSERTION START: MENU STATE VARIABLES !!!!!
  const initialMenu = { items: [] };

  const [menu, setMenu] = useState(initialMenu);
  const [savedMenu, setSavedMenu] = useState(initialMenu);
  // !!!!! INSERTION END: MENU STATE VARIABLES !!!!!

  // !!!!! INSERTION START: BANNER STATE VARIABLES !!!!!
  const [banner, setBanner] = useState(initialBanner);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  // !!!!! INSERTION END: BANNER STATE VARIABLES !!!!!

  // !!!!! INSERTION START: CATEGORY HIGHLIGHTS STATE !!!!!
  const [categoryHighlights, setCategoryHighlights] = useState(
    initialCategoryHighlights
  );
  const [savedCategoryHighlights, setSavedCategoryHighlights] = useState(
    initialCategoryHighlights
  );
  // !!!!! INSERTION END: CATEGORY HIGHLIGHTS STATE !!!!!

  // !!!!! INSERTION START: PHASE 6 COURSE CATEGORIES STATE !!!!!
  const [availableCourseCategories, setAvailableCourseCategories] =
    useState([]);

  const [courseCategories, setCourseCategories] = useState(
    initialCourseCategories
  );

  const [savedCourseCategories, setSavedCourseCategories] = useState(
    initialCourseCategories
  );
  // !!!!! INSERTION END: PHASE 6 COURSE CATEGORIES STATE !!!!!

  // Phase 7: Trending Courses state
  const [availableTrendingCourses, setAvailableTrendingCourses] =
    useState([]);

  const [trendingCourses, setTrendingCourses] = useState(
    initialTrendingCourses
  );

  const [savedTrendingCourses, setSavedTrendingCourses] = useState(
    initialTrendingCourses
  );

  // Phase 8: Study Resources state
  const [studyResources, setStudyResources] = useState(
    initialStudyResources
  );

  const [savedStudyResources, setSavedStudyResources] = useState(
    initialStudyResources
  );

  // Phase 9: Certificate Section
  const [certificateSection, setCertificateSection] = useState(
    initialCertificateSection
  );
  const [savedCertificateSection, setSavedCertificateSection] =
    useState(initialCertificateSection);

  // Phase 10: Partners
  const [partners, setPartners] = useState(initialPartners);
  const [savedPartners, setSavedPartners] = useState(initialPartners);

  // Phase 11: Placement Stories
  const [placementStories, setPlacementStories] = useState(
    initialPlacementStories
  );
  const [savedPlacementStories, setSavedPlacementStories] =
    useState(initialPlacementStories);

  // Phase 12: Our Team
  const [team, setTeam] = useState(initialTeam);
  const [savedTeam, setSavedTeam] = useState(initialTeam);

  // Phase 13: Free Videos
  const [freeVideos, setFreeVideos] = useState(initialFreeVideos);
  const [savedFreeVideos, setSavedFreeVideos] =
    useState(initialFreeVideos);
  
  // Phase 14: Careers
  const [careers, setCareers] = useState(initialCareers);
  const [savedCareers, setSavedCareers] = useState(initialCareers);

  // Phase 15: Testimonials
  const [testimonials, setTestimonials] = useState(
    initialTestimonials
  );

  const [savedTestimonials, setSavedTestimonials] = useState(
    initialTestimonials
  );

  // Phase 16: Contact Us
  const [contactUs, setContactUs] = useState(initialContactUs);
  const [savedContactUs, setSavedContactUs] = useState(initialContactUs);

  // Phase 17: Footer
  const [footerSettings, setFooterSettings] = useState(
    initialFooterSettings
  );

  const [savedFooterSettings, setSavedFooterSettings] = useState(
    initialFooterSettings
  );


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoInputKey, setLogoInputKey] = useState(0);

  const selectedSection = useMemo(
    () => editorSections.find((item) => item.id === activeSection),
    [activeSection]
  );

  const logoUrl = institute.logoUrl
    ? getAssetUrl(institute.logoUrl)
    : "";

  const bannerSlides = (banner.slides || []).map((slide) => ({
    ...slide,
    imageUrl: getAssetUrl(slide.imageUrl),
  }));

    const hasUnsavedChanges =
      JSON.stringify(header) !== JSON.stringify(savedHeader) ||
      JSON.stringify(institute) !== JSON.stringify(savedInstitute) ||
      JSON.stringify(menu) !== JSON.stringify(savedMenu) ||
      JSON.stringify(courseCategories) !==
        JSON.stringify(savedCourseCategories) ||
      JSON.stringify(categoryHighlights) !==
        JSON.stringify(savedCategoryHighlights) ||
      JSON.stringify(trendingCourses) !==
        JSON.stringify(savedTrendingCourses) ||
      JSON.stringify(studyResources) !==
        JSON.stringify(savedStudyResources)  ||
      JSON.stringify(certificateSection) !==
        JSON.stringify(savedCertificateSection)  ||
      JSON.stringify(partners) !== JSON.stringify(savedPartners) ||
      JSON.stringify(placementStories) !==
        JSON.stringify(savedPlacementStories)  ||
      JSON.stringify(team) !== JSON.stringify(savedTeam)  ||
      JSON.stringify(freeVideos) !== JSON.stringify(savedFreeVideos) ||
      JSON.stringify(careers) !== JSON.stringify(savedCareers)  || 
      JSON.stringify(testimonials) !==
        JSON.stringify(savedTestimonials) ||
      JSON.stringify(contactUs) !== JSON.stringify(savedContactUs) || 
      JSON.stringify(footerSettings) !==
        JSON.stringify(savedFooterSettings);


  // !!!!! INSERTION START: LOAD HEADER, INSTITUTE AND MENU SETTINGS !!!!!
  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const [
        headerData,
        instituteData,
        menuData,
        bannerData,
        categoryData,
        courseCategoryData,
        trendingCourseData,
        studyResourceData,
        certificateSectionData,
        partnerData,
        placementStoriesData,
        teamData,
        freeVideoData,
        careerData,
        testimonialData,
        contactData,
        footerData,
      ] = await Promise.all([
        websiteEditorService.getHeaderSettings(),
        instituteSettingsService.getSettings(),
        websiteEditorService.getMenuSettings(),
        websiteEditorService.getBannerSettings(),
        websiteEditorService.getCategoryHighlights(),
        websiteEditorService.getCourseCategorySettings(),
        websiteEditorService.getTrendingCourseSettings(),
        websiteEditorService.getStudyResourcesSettings(),
        websiteEditorService.getCertificateSectionSettings(),
        websiteEditorService.getPartnerSettings(),
        websiteEditorService.getPlacementStoriesSettings(),
        websiteEditorService.getTeamSettings(),
        websiteEditorService.getFreeVideoSettings(),
        websiteEditorService.getCareerSettings(),
        websiteEditorService.getTestimonialSettings(),
        contactUsService.getContactSettings(),
        websiteEditorService.getFooterSettings(),
      ]);

      const nextHeader = {
        ...initialHeader,
        ...(headerData || {}),
      };

      const nextInstitute = {
        ...initialInstitute,
        ...(instituteData || {}),
      };

      setHeader(nextHeader);
      setSavedHeader(nextHeader);
      setInstitute(nextInstitute);
      setSavedInstitute(nextInstitute);

      // !!!!! INSERTION START: INITIALIZE MENU SETTINGS !!!!!
      const nextMenu = {
        items: Array.isArray(menuData?.items)
          ? menuData.items
          : [],
      };

      setMenu(nextMenu);
      setSavedMenu(nextMenu);
      // !!!!! INSERTION END: INITIALIZE MENU SETTINGS !!!!!

      const nextBanner = {
        slides: Array.isArray(bannerData?.slides)
          ? bannerData.slides
          : [],
      };

      setBanner(nextBanner);

      // !!!!! INSERTION START: LOAD CATEGORY HIGHLIGHTS !!!!!
      const nextCategoryHighlights = {
        items: Array.isArray(categoryData?.items)
          ? categoryData.items
          : [],
      };

      setCategoryHighlights(nextCategoryHighlights);
      setSavedCategoryHighlights(nextCategoryHighlights);
      // !!!!! INSERTION END: LOAD CATEGORY HIGHLIGHTS !!!!!


      // !!!!! INSERTION START: LOAD PHASE 6 COURSE CATEGORIES !!!!!
      const nextAvailableCategories = Array.isArray(
        courseCategoryData?.categories
      )
        ? courseCategoryData.categories
        : [];

      setAvailableCourseCategories(nextAvailableCategories);

      // Exclude deleted and inactive categories from saved selections.
      const activeCategoryIds = new Set(
        nextAvailableCategories
          .filter((category) => category.status === "Active")
          .map((category) => String(category._id))
      );

      const nextCourseCategories = {
        selectedCategoryIds: Array.isArray(
          courseCategoryData?.settings?.selectedCategoryIds
        )
          ? courseCategoryData.settings.selectedCategoryIds
              .map(String)
              .filter((id) => activeCategoryIds.has(id))
          : [],
      };

      setCourseCategories(nextCourseCategories);
      setSavedCourseCategories(nextCourseCategories);
      // !!!!! INSERTION END: LOAD PHASE 6 COURSE CATEGORIES !!!!!

      // Phase 7: Load Trending Courses
      const nextAvailableTrendingCourses = Array.isArray(
        trendingCourseData?.courses
      )
        ? trendingCourseData.courses
        : [];

      setAvailableTrendingCourses(nextAvailableTrendingCourses);

      const publishedCourseIds = new Set(
        nextAvailableTrendingCourses
          .filter((course) => course.status === "Published")
          .map((course) => String(course._id))
      );

      const nextTrendingCourses = {
        selectedCourseIds: Array.isArray(
          trendingCourseData?.settings?.selectedCourseIds
        )
          ? trendingCourseData.settings.selectedCourseIds
              .map(String)
              .filter((id) => publishedCourseIds.has(id))
          : [],
      };

      setTrendingCourses(nextTrendingCourses);
      setSavedTrendingCourses(nextTrendingCourses);

      // Phase 8: Load Study Resources
      const nextStudyResources = {
        items: Array.isArray(studyResourceData?.items)
          ? studyResourceData.items.map((item, index) => ({
              ...item,
              displayOrder: index,
            }))
          : [],
      };

      setStudyResources(nextStudyResources);
      setSavedStudyResources(nextStudyResources);

      // Phase 9: Load Certificate Section
      const nextCertificateSection = {
        ...initialCertificateSection,
        ...(certificateSectionData || {}),
        listItems: Array.isArray(certificateSectionData?.listItems)
          ? certificateSectionData.listItems.map((item, index) => ({
              ...item,
              displayOrder: index,
            }))
          : [],
      };

      setCertificateSection(nextCertificateSection);
      setSavedCertificateSection(nextCertificateSection);

      // Phase 10: Load Partners
      const nextPartners = {
        ...initialPartners,
        ...(partnerData || {}),
        logos: Array.isArray(partnerData?.logos)
          ? partnerData.logos.map((logo, index) => ({
              ...logo,
              displayOrder: index,
            }))
          : [],
      };

      setPartners(nextPartners);
      setSavedPartners(nextPartners);

      // Phase 11: Load Placement Stories
      const nextPlacementStories = {
        ...initialPlacementStories,
        ...(placementStoriesData || {}),
        stories: Array.isArray(placementStoriesData?.stories)
          ? placementStoriesData.stories.map((story, index) => ({
              ...story,
              displayOrder: index,
              isVisible: story.isVisible !== false,
            }))
          : [],
      };

      setPlacementStories(nextPlacementStories);
      setSavedPlacementStories(nextPlacementStories);


      // Phase 12: Load Our Team
      const nextTeam = {
        ...initialTeam,
        ...(teamData || {}),
        members: Array.isArray(teamData?.members)
          ? teamData.members.map((member, index) => ({
              ...member,
              displayOrder: index,
              isVisible: member.isVisible !== false,
            }))
          : [],
      };

      setTeam(nextTeam);
      setSavedTeam(nextTeam);

      // Phase 13: Load Free Videos
      const nextFreeVideos = {
        ...initialFreeVideos,
        ...(freeVideoData || {}),
        videos: Array.isArray(freeVideoData?.videos)
          ? freeVideoData.videos.map((video, index) => ({
              ...video,
              displayOrder: index,
              isVisible: video.isVisible !== false,
            }))
          : [],
      };

      setFreeVideos(nextFreeVideos);
      setSavedFreeVideos(nextFreeVideos);


      // Phase 14: Load Careers
      const nextCareers = {
        ...initialCareers,
        ...(careerData || {}),
        jobs: Array.isArray(careerData?.jobs)
          ? careerData.jobs.map((job, index) => ({
              ...job,
              displayOrder: index,
              skills: Array.isArray(job.skills) ? job.skills : [],
              isVisible: job.isVisible !== false,
            }))
          : [],
      };

      setCareers(nextCareers);
      setSavedCareers(nextCareers);

      // Phase 15: Load Testimonials
      const nextTestimonials = {
        ...initialTestimonials,
        ...(testimonialData || {}),
        testimonials: Array.isArray(testimonialData?.testimonials)
          ? testimonialData.testimonials.map((item, index) => ({
              ...item,
              displayOrder: index,
              imageUrl: item.imageUrl || "",
              imageVersion: item.imageVersion || "",
              isVisible: item.isVisible !== false,
            }))
          : [],
      };

      setTestimonials(nextTestimonials);
      setSavedTestimonials(nextTestimonials);


      // Phase 16: Load Contact Us
      const nextContactUs = {
        ...initialContactUs,
        ...(contactData || {}),
      };

      setContactUs(nextContactUs);
      setSavedContactUs(nextContactUs);


      // Phase 17: Load Footer
      const nextFooterSettings = {
        ...initialFooterSettings,
        ...(footerData || {}),
        columnOneLinks: Array.isArray(footerData?.columnOneLinks)
          ? footerData.columnOneLinks
          : [],
        columnTwoLinks: Array.isArray(footerData?.columnTwoLinks)
          ? footerData.columnTwoLinks
          : [],
      };

      setFooterSettings(nextFooterSettings);
      setSavedFooterSettings(nextFooterSettings);


    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to load website header settings."
      );
    } finally {
      setLoading(false);
    }
  }, []);
  // !!!!! INSERTION END: LOAD HEADER, INSTITUTE AND MENU SETTINGS !!!!!


  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateHeader = (field, value) => {
    setHeader((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateInstitute = (field, value) => {
    setInstitute((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // !!!!! INSERTION START: UPDATE MENU SETTINGS !!!!!
  const updateMenu = (items) => {
    setMenu({ items });
  };
  // !!!!! INSERTION END: UPDATE MENU SETTINGS !!!!!


  // !!!!! INSERTION START: CATEGORY HIGHLIGHTS HANDLERS !!!!!
  const updateCategoryHighlights = (items) => {
    setCategoryHighlights({ items });
  };

  const uploadCategoryHighlightIcon = async (file) => {
    return websiteEditorService.uploadCategoryHighlightIcon(file);
  };
  // !!!!! INSERTION END: CATEGORY HIGHLIGHTS HANDLERS !!!!!

  // !!!!! INSERTION START: UPDATE PHASE 6 COURSE CATEGORIES !!!!!
  const updateCourseCategories = (selectedCategoryIds) => {
    setCourseCategories({
      selectedCategoryIds,
    });
  };
  // !!!!! INSERTION END: UPDATE PHASE 6 COURSE CATEGORIES !!!!!

  // Phase 7: Update Trending Courses
  const updateTrendingCourses = (selectedCourseIds) => {
    setTrendingCourses({
      selectedCourseIds,
    });
  };

  // Phase 8: Update Study Resources
  const updateStudyResources = (items) => {
    setStudyResources({
      items: items.map((item, index) => ({
        ...item,
        displayOrder: index,
      })),
    });
  };

  const uploadStudyResourceImage = async (file) => {
    try {
      const uploaded =
        await websiteEditorService.uploadStudyResourceImage(file);

      notification.success("Study Resource image uploaded successfully.");

      return uploaded;
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to upload Study Resource image."
      );

      throw error;
    }
  };

  // Phase 9: Update Certificate Section
  const updateCertificateSection = (nextSettings) => {
    setCertificateSection({
      ...nextSettings,
      listItems: (nextSettings.listItems || []).map(
        (item, index) => ({
          ...item,
          displayOrder: index,
        })
      ),
    });
  };

  // Phase 9: Upload certificate image
  const uploadCertificateSectionImage = async (file) => {
    try {
      const uploaded =
        await websiteEditorService.uploadCertificateSectionImage(file);

      notification.success(
        "Certificate Section image uploaded successfully."
      );

      return uploaded;
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to upload Certificate Section image."
      );

      throw error;
    }
  };


  // Phase 10: Update Partners
  const updatePartners = (nextSettings) => {
    setPartners({
      ...nextSettings,
      logos: (nextSettings.logos || []).map((logo, index) => ({
        ...logo,
        displayOrder: index,
      })),
    });
  };

  // Phase 10: Upload partner logo
  const uploadPartnerLogo = async (file) => {
    try {
      const uploaded =
        await websiteEditorService.uploadPartnerLogo(file);

      return uploaded;
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to upload partner logo."
      );

      throw error;
    }
  };


  // Phase 11: Update Placement Stories
  const updatePlacementStories = (nextSettings) => {
    setPlacementStories({
      ...nextSettings,
      stories: (nextSettings.stories || []).map(
        (story, index) => ({
          ...story,
          displayOrder: index,
        })
      ),
    });
  };

  // Phase 11: Upload Placement Story image
  const uploadPlacementStoryImage = async (file) => {
    try {
      return await websiteEditorService.uploadPlacementStoryImage(file);
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to upload placement story image."
      );

      throw error;
    }
  };


  // Phase 12: Update Our Team
  const updateTeam = (nextSettings) => {
    setTeam({
      ...nextSettings,
      members: (nextSettings.members || []).map(
        (member, index) => ({
          ...member,
          displayOrder: index,
        })
      ),
    });
  };

  // Phase 12: Upload team member image
  const uploadTeamMemberImage = async (file) => {
    try {
      return await websiteEditorService.uploadTeamMemberImage(file);
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to upload team member image."
      );

      throw error;
    }
  };

  
  // Phase 13: Update Free Videos
  const updateFreeVideos = (nextSettings) => {
    setFreeVideos({
      ...nextSettings,
      videos: (nextSettings.videos || []).map(
        (video, index) => ({
          ...video,
          displayOrder: index,
        })
      ),
    });
  };


  // Phase 14: Update Careers
  const updateCareers = (nextSettings) => {
    setCareers({
      ...nextSettings,
      jobs: (nextSettings.jobs || []).map((job, index) => ({
        ...job,
        displayOrder: index,
      })),
    });
  };


  // Phase 15: Upload testimonial image
  const uploadTestimonialImage = async (file) => {
    try {
      return await websiteEditorService.uploadTestimonialImage(file);
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to upload testimonial image."
      );
      throw error;
    }
  };
  
  // Phase 15: Update Testimonials
  const updateTestimonials = (nextSettings) => {
    setTestimonials({
      ...nextSettings,
      testimonials: (nextSettings.testimonials || []).map(
        (item, index) => ({
          ...item,
          displayOrder: index,
        })
      ),
    });
  };


  const handleBannerUpload = async (file, slideKey = "") => {
    if (!file) return;

    setUploadingBanner(true);

    try {
      const updated = await websiteEditorService.uploadBannerSlide(
        file,
        slideKey
      );

      setBanner({
        slides: Array.isArray(updated?.slides)
          ? updated.slides
          : [],
      });

      notification.success(
        slideKey
          ? "Banner image replaced successfully."
          : "Banner slide added successfully."
      );
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) || "Unable to upload banner image."
      );
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleBannerDelete = async (slideKey) => {
    const confirmed = await notification.confirm({
      title: "Delete banner slide?",
      text: "This will permanently delete the selected banner image.",
      icon: "warning",
      confirmText: "Delete Slide",
      cancelText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    try {
      const updated = await websiteEditorService.deleteBannerSlide(
        slideKey
      );

      setBanner({
        slides: Array.isArray(updated?.slides)
          ? updated.slides
          : [],
      });

      notification.success("Banner slide deleted successfully.");
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) || "Unable to delete banner slide."
      );
    }
  };

  const handleBannerReorder = async (slideKeys) => {
    try {
      const updated = await websiteEditorService.reorderBannerSlides(
        slideKeys
      );

      setBanner({
        slides: Array.isArray(updated?.slides)
          ? updated.slides
          : [],
      });

      notification.success("Banner slide order updated.");
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) || "Unable to reorder banner slides."
      );
    }
  };

  const handleSectionClick = (section) => {
    setActiveSection(section.id);
    setExpandedSection((current) =>
      current === section.id ? "" : section.id
    );
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      notification.warning("Choose a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notification.warning("Logo must be 2 MB or smaller.");
      return;
    }

    setUploadingLogo(true);

    try {
      const updated = await instituteSettingsService.uploadLogo(file);

      const nextInstitute = {
        ...institute,
        ...(updated || {}),
      };

      setInstitute(nextInstitute);
      setSavedInstitute((current) => ({
        ...current,
        ...(updated || {}),
      }));

      notification.success("Institute logo uploaded successfully.");
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) || "Unable to upload institute logo."
      );
    } finally {
      setUploadingLogo(false);
      setLogoInputKey((current) => current + 1);
    }
  };

  const addQuickLink = () => {
    if (header.quickLinks.length >= 8) {
      notification.warning("Maximum 8 quick links are allowed.");
      return;
    }

    updateHeader("quickLinks", [
      ...header.quickLinks,
      { label: "", url: "" },
    ]);
  };

  const updateQuickLink = (index, field, value) => {
    updateHeader(
      "quickLinks",
      header.quickLinks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeQuickLink = (index) => {
    updateHeader(
      "quickLinks",
      header.quickLinks.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const addSocialLink = () => {
    if (header.socialLinks.length >= 5) {
      notification.warning("Maximum 5 social links are allowed.");
      return;
    }

    const platforms = [
      "Facebook",
      "Instagram",
      "YouTube",
      "LinkedIn",
      "X",
    ];

    const available = platforms.find(
      (platform) =>
        !header.socialLinks.some((item) => item.platform === platform)
    );

    if (!available) return;

    updateHeader("socialLinks", [
      ...header.socialLinks,
      { platform: available, url: "" },
    ]);
  };

  const updateSocialLink = (index, field, value) => {
    updateHeader(
      "socialLinks",
      header.socialLinks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeSocialLink = (index) => {
    updateHeader(
      "socialLinks",
      header.socialLinks.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const validateHeader = () => {
    if (
      header.showLoginButton &&
      !header.loginButtonLabel.trim()
    ) {
      notification.warning("Enter the Login button label.");
      return false;
    }

    if (
      header.showEnquiryButton &&
      !header.enquiryButtonLabel.trim()
    ) {
      notification.warning("Enter the Enquiry button label.");
      return false;
    }

    if (
      header.quickLinks.some(
        (item) => !item.label.trim() || !item.url.trim()
      )
    ) {
      notification.warning(
        "Complete or remove every empty quick link."
      );
      return false;
    }

    if (
      header.socialLinks.some((item) => !item.url.trim())
    ) {
      notification.warning(
        "Complete or remove every empty social link."
      );
      return false;
    }

    return true;
  };

  // !!!!! INSERTION START: SAVE HEADER, INSTITUTE AND MENU SETTINGS !!!!!
  const handleSaveDraft = async () => {
    if (!validateHeader()) return;

    const invalidMenuItem = (menu.items || []).some((item) =>
      !item.label?.trim() ||
      !item.url?.trim() ||
      (item.children || []).some(
        (child) =>
          !child.label?.trim() || !child.url?.trim()
      )
    );

    if (invalidMenuItem) {
      notification.warning(
        "Complete or remove every empty menu and submenu item."
      );
      setActiveSection("menu");
      setExpandedSection("menu");
      return;
    }

    // !!!!! INSERTION START: VALIDATE CATEGORY HIGHLIGHTS !!!!!
    const invalidCategoryHighlight = (
      categoryHighlights.items || []
    ).some(
      (item) =>
        !item.title?.trim() ||
        !item.description?.trim()
    );

    if (invalidCategoryHighlight) {
      notification.warning(
        "Complete the title and description of every highlight, or remove the incomplete item."
      );
      setActiveSection("categories");
      setExpandedSection("categories");
      return;
    }
    // !!!!! INSERTION END: VALIDATE CATEGORY HIGHLIGHTS !!!!!

    // Phase 8: Validate Study Resources
    const invalidStudyResource = (studyResources.items || []).some(
      (item) =>
        !item.imageUrl?.trim() ||
        !item.imageVersion?.trim() ||
        !item.title?.trim() ||
        !item.description?.trim() ||
        !item.buttonText?.trim() ||
        !item.buttonUrl?.trim()
    );

    if (invalidStudyResource) {
      notification.warning(
        "Complete the image, title, description and button details of every Study Resource card, or remove the incomplete card."
      );

      setActiveSection("resources");
      setExpandedSection("resources");
      return;
    }

    // Phase 9: Validate Certificate Section
    if (certificateSection.enabled) {
      const hasInvalidListItem = (
        certificateSection.listItems || []
      ).some((item) => !item.text?.trim());

      if (
        !certificateSection.imageUrl?.trim() ||
        !certificateSection.imageVersion?.trim() ||
        !certificateSection.title?.trim() ||
        !certificateSection.description?.trim() ||
        !certificateSection.buttonText?.trim() ||
        hasInvalidListItem ||
        (
          certificateSection.buttonAction === "url" &&
          !certificateSection.externalUrl?.trim()
        )
      ) {
        notification.warning(
          "Complete the Certificate Section image, title, description, list items and button settings before enabling it."
        );

        setActiveSection("certificate");
        setExpandedSection("certificate");
        return;
      }
    }

    // Phase 10: Validate Partners
    if (!partners.heading?.trim()) {
      notification.warning("Please enter the Partners heading.");
      setActiveSection("partners");
      setExpandedSection("partners");
      return;
    }

    if (
      !Number.isInteger(Number(partners.visibleCount)) ||
      Number(partners.visibleCount) < 1 ||
      Number(partners.visibleCount) > 8
    ) {
      notification.warning(
        "Choose a desktop logo display count between 1 and 8."
      );
      setActiveSection("partners");
      setExpandedSection("partners");
      return;
    }

    const hasIncompletePartnerLogo = (partners.logos || []).some(
      (logo) => !logo.imageUrl?.trim() || !logo.imageVersion?.trim()
    );

    if (hasIncompletePartnerLogo) {
      notification.warning(
        "Upload a JPG image for every partner logo before saving."
      );
      setActiveSection("partners");
      setExpandedSection("partners");
      return;
    }

    if ((partners.logos || []).length > 20) {
      notification.warning("Maximum 20 partner logos are allowed.");
      setActiveSection("partners");
      setExpandedSection("partners");
      return;
    }


    // Phase 11: Validate Placement Stories
    if (!placementStories.heading?.trim()) {
      notification.warning(
        "Please enter the Placement Stories heading."
      );

      setActiveSection("placements");
      setExpandedSection("placements");
      return;
    }

    if ((placementStories.stories || []).length > 20) {
      notification.warning(
        "Maximum 20 placement stories are allowed."
      );

      setActiveSection("placements");
      setExpandedSection("placements");
      return;
    }

    const hasIncompletePlacementStory = (
      placementStories.stories || []
    ).some(
      (story) =>
        !story.imageUrl?.trim() ||
        !story.imageVersion?.trim() ||
        !story.title?.trim() ||
        !story.description?.trim()
    );

    if (hasIncompletePlacementStory) {
      notification.warning(
        "Complete the image, title and description of every placement story, or remove the incomplete story."
      );

      setActiveSection("placements");
      setExpandedSection("placements");
      return;
    }


    // Phase 12: Validate Our Team
    if (!team.heading?.trim()) {
      notification.warning(
        "Please enter the Our Team heading."
      );

      setActiveSection("team");
      setExpandedSection("team");
      return;
    }

    if ((team.members || []).length > 20) {
      notification.warning(
        "Maximum 20 team members are allowed."
      );

      setActiveSection("team");
      setExpandedSection("team");
      return;
    }

    const hasIncompleteTeamMember = (
      team.members || []
    ).some(
      (member) =>
        !member.imageUrl?.trim() ||
        !member.imageVersion?.trim() ||
        !member.name?.trim() ||
        !member.designation?.trim()
    );

    if (hasIncompleteTeamMember) {
      notification.warning(
        "Complete the image, name and designation of every team member, or remove the incomplete member."
      );

      setActiveSection("team");
      setExpandedSection("team");
      return;
    }

    // Phase 13: Validate Free Videos
    if (!freeVideos.heading?.trim()) {
      notification.warning(
        "Please enter the Free Videos heading."
      );

      setActiveSection("videos");
      setExpandedSection("videos");
      return;
    }

    if ((freeVideos.videos || []).length > 20) {
      notification.warning(
        "Maximum 20 free videos are allowed."
      );

      setActiveSection("videos");
      setExpandedSection("videos");
      return;
    }

    const hasIncompleteFreeVideo = (
      freeVideos.videos || []
    ).some(
      (video) =>
        !video.title?.trim() ||
        !video.videoUrl?.trim()
    );

    if (hasIncompleteFreeVideo) {
      notification.warning(
        "Complete the title and YouTube URL of every video, or remove the incomplete video."
      );

      setActiveSection("videos");
      setExpandedSection("videos");
      return;
    }


    setSaving(true);

    try {
      const institutePayload = {
        instituteName: institute.instituteName,
        email: institute.email,
        phone: institute.phone,
        alternatePhone: institute.alternatePhone,
        website: institute.website,
        address: institute.address,
      };

      const [
        savedHeaderData,
        savedInstituteData,
        savedMenuData,
        savedCategoryData,
        savedCourseCategoryData,
        savedTrendingCourseData,
        savedStudyResourceData,
        savedCertificateSectionData,
        savedPartnerData,
        savedPlacementStoriesData,
        savedTeamData,
        savedFreeVideoData,
        savedCareerData,
        savedTestimonialData,
        savedContactUsData,
        savedFooterData,
      ] = await Promise.all([
        websiteEditorService.updateHeaderSettings(header),
        instituteSettingsService.updateSettings(institutePayload),
        websiteEditorService.updateMenuSettings(menu),
        websiteEditorService.updateCategoryHighlights(categoryHighlights),
        websiteEditorService.updateCourseCategorySettings(
          courseCategories
        ),
        websiteEditorService.updateTrendingCourseSettings(
          trendingCourses
        ),
        websiteEditorService.updateStudyResourcesSettings(
          studyResources
        ),
        websiteEditorService.updateCertificateSectionSettings(
          certificateSection
        ),
        websiteEditorService.updatePartnerSettings(partners),
        websiteEditorService.updatePlacementStoriesSettings(
          placementStories
        ),
        websiteEditorService.updateTeamSettings(team),
        websiteEditorService.updateFreeVideoSettings(freeVideos),
        websiteEditorService.updateCareerSettings(careers),
        websiteEditorService.updateTestimonialSettings(testimonials),
        contactUsService.updateContactSettings(contactUs),
        websiteEditorService.updateFooterSettings(footerSettings),
      ]);

      const nextHeader = {
        ...initialHeader,
        ...(savedHeaderData || header),
      };

      const nextInstitute = {
        ...institute,
        ...(savedInstituteData || {}),
      };

      const nextMenu = {
        items: Array.isArray(savedMenuData?.items)
          ? savedMenuData.items
          : menu.items,
      };

      setHeader(nextHeader);
      setSavedHeader(nextHeader);

      setInstitute(nextInstitute);
      setSavedInstitute(nextInstitute);

      setMenu(nextMenu);
      setSavedMenu(nextMenu);

      // !!!!! INSERTION START: SAVE CATEGORY HIGHLIGHTS STATE !!!!!
      const nextCategoryHighlights = {
        items: Array.isArray(savedCategoryData?.items)
          ? savedCategoryData.items
          : categoryHighlights.items,
      };

      setCategoryHighlights(nextCategoryHighlights);
      setSavedCategoryHighlights(nextCategoryHighlights);
      // !!!!! INSERTION END: SAVE CATEGORY HIGHLIGHTS STATE !!!!!


      // !!!!! INSERTION START: SAVE PHASE 6 COURSE CATEGORIES !!!!!
      const nextCourseCategories = {
        selectedCategoryIds: Array.isArray(
          savedCourseCategoryData?.selectedCategoryIds
        )
          ? savedCourseCategoryData.selectedCategoryIds.map(String)
          : courseCategories.selectedCategoryIds,
      };

      setCourseCategories(nextCourseCategories);
      setSavedCourseCategories(nextCourseCategories);
      // !!!!! INSERTION END: SAVE PHASE 6 COURSE CATEGORIES !!!!!


      // Phase 7: Save Trending Courses state
      const nextTrendingCourses = {
        selectedCourseIds: Array.isArray(
          savedTrendingCourseData?.selectedCourseIds
        )
          ? savedTrendingCourseData.selectedCourseIds.map(String)
          : trendingCourses.selectedCourseIds,
      };

      setTrendingCourses(nextTrendingCourses);
      setSavedTrendingCourses(nextTrendingCourses);

      // Phase 8: Save Study Resources state
    const nextStudyResources = {
      items: Array.isArray(savedStudyResourceData?.items)
        ? savedStudyResourceData.items.map((item, index) => ({
            ...item,
            displayOrder: index,
          }))
        : studyResources.items,
    };

    setStudyResources(nextStudyResources);
    setSavedStudyResources(nextStudyResources);

    // Phase 9: Save Certificate Section state
    const nextCertificateSection = {
      ...initialCertificateSection,
      ...(savedCertificateSectionData || certificateSection),
      listItems: Array.isArray(savedCertificateSectionData?.listItems)
        ? savedCertificateSectionData.listItems.map((item, index) => ({
            ...item,
            displayOrder: index,
          }))
        : certificateSection.listItems,
    };

    setCertificateSection(nextCertificateSection);
    setSavedCertificateSection(nextCertificateSection);


    // Phase 10: Save Partners
      const nextPartners = {
        ...initialPartners,
        ...(savedPartnerData || partners),
        logos: Array.isArray(savedPartnerData?.logos)
          ? savedPartnerData.logos.map((logo, index) => ({
              ...logo,
              displayOrder: index,
            }))
          : partners.logos,
      };

      setPartners(nextPartners);
      setSavedPartners(nextPartners);

    // Phase 11: Save Placement Stories
      const nextPlacementStories = {
        ...initialPlacementStories,
        ...(savedPlacementStoriesData || placementStories),
        stories: Array.isArray(savedPlacementStoriesData?.stories)
          ? savedPlacementStoriesData.stories.map((story, index) => ({
              ...story,
              displayOrder: index,
              isVisible: story.isVisible !== false,
            }))
          : placementStories.stories,
      };

      setPlacementStories(nextPlacementStories);
      setSavedPlacementStories(nextPlacementStories);


      // Phase 12: Save Our Team
      const nextTeam = {
        ...initialTeam,
        ...(savedTeamData || team),
        members: Array.isArray(savedTeamData?.members)
          ? savedTeamData.members.map((member, index) => ({
              ...member,
              displayOrder: index,
              isVisible: member.isVisible !== false,
            }))
          : team.members,
      };

      setTeam(nextTeam);
      setSavedTeam(nextTeam);


      // Phase 13: Save Free Videos
      const nextFreeVideos = {
        ...initialFreeVideos,
        ...(savedFreeVideoData || freeVideos),
        videos: Array.isArray(savedFreeVideoData?.videos)
          ? savedFreeVideoData.videos.map((video, index) => ({
              ...video,
              displayOrder: index,
              isVisible: video.isVisible !== false,
            }))
          : freeVideos.videos,
      };

      setFreeVideos(nextFreeVideos);
      setSavedFreeVideos(nextFreeVideos);


      // Phase 14: Save Careers
      const nextCareers = {
        ...initialCareers,
        ...(savedCareerData || careers),
        jobs: Array.isArray(savedCareerData?.jobs)
          ? savedCareerData.jobs.map((job, index) => ({
              ...job,
              displayOrder: index,
              skills: Array.isArray(job.skills) ? job.skills : [],
              isVisible: job.isVisible !== false,
            }))
          : careers.jobs,
      };

      setCareers(nextCareers);
      setSavedCareers(nextCareers);


      // Phase 15: Save Testimonials
      const nextTestimonials = {
        ...initialTestimonials,
        ...(savedTestimonialData || testimonials),
        testimonials: Array.isArray(savedTestimonialData?.testimonials)
          ? savedTestimonialData.testimonials.map((item, index) => ({
              ...item,
              displayOrder: index,
              imageUrl: item.imageUrl || "",
              imageVersion: item.imageVersion || "",
              isVisible: item.isVisible !== false,
            }))
          : testimonials.testimonials,
      };

      setTestimonials(nextTestimonials);
      setSavedTestimonials(nextTestimonials);


      // Phase 16: Save Contact Us
      const nextContactUs = {
        ...initialContactUs,
        ...(savedContactUsData || contactUs),
      };

      setContactUs(nextContactUs);
      setSavedContactUs(nextContactUs);


      // Phase 17: Save Footer
      const nextFooterSettings = {
        ...initialFooterSettings,
        ...(savedFooterData || footerSettings),
        columnOneLinks: Array.isArray(savedFooterData?.columnOneLinks)
          ? savedFooterData.columnOneLinks
          : footerSettings.columnOneLinks,
        columnTwoLinks: Array.isArray(savedFooterData?.columnTwoLinks)
          ? savedFooterData.columnTwoLinks
          : footerSettings.columnTwoLinks,
      };

      setFooterSettings(nextFooterSettings);
      setSavedFooterSettings(nextFooterSettings);


      notification.success(
        "Website editor settings saved successfully."
      );
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to save website editor settings."
      );
    } finally {
      setSaving(false);
    }
  };
  // !!!!! INSERTION END: SAVE HEADER, INSTITUTE AND MENU SETTINGS !!!!!

  const handleDiscard = async () => {
    if (!hasUnsavedChanges) {
      await loadSettings();
      return;
    }

    const confirmed = await notification.confirm({
      title: "Discard unsaved changes?",
      text: "Your unsaved Header, Topbar, Menu, Category Highlights, Course Categories, Trending Courses and Study Resources and Certificate Section, Partners, Placement Stories, Our Team, Free Videos, careers, testimonials changes will be discarded.",
      icon: "warning",
      confirmText: "Discard Changes",
      cancelText: "Continue Editing",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    setHeader(savedHeader);
    setInstitute(savedInstitute);

    // !!!!! INSERTION START: RESTORE SAVED MENU SETTINGS !!!!!
    setMenu(savedMenu);
    // !!!!! INSERTION END: RESTORE SAVED MENU SETTINGS !!!!!

    // !!!!! INSERTION START: RESTORE CATEGORY HIGHLIGHTS !!!!!
    setCategoryHighlights(savedCategoryHighlights);
    // !!!!! INSERTION END: RESTORE CATEGORY HIGHLIGHTS !!!!!

    // !!!!! INSERTION START: RESTORE PHASE 6 COURSE CATEGORIES !!!!!
    setCourseCategories(savedCourseCategories);
    // !!!!! INSERTION END: RESTORE PHASE 6 COURSE CATEGORIES !!!!!

    // Phase 7: Restore saved Trending Courses
    setTrendingCourses(savedTrendingCourses);

    // Phase 8: Restore saved Study Resources
    setStudyResources(savedStudyResources);

    // Phase 9: Restore Certificate Section
    setCertificateSection(savedCertificateSection);

    // Phase 10: Restore Partners
    setPartners(savedPartners);

    // Phase 11: Restore Placement Stories
    setPlacementStories(savedPlacementStories);

    // Phase 12: Restore Our Team
    setTeam(savedTeam);

    // Phase 13: Restore Free Videos
    setFreeVideos(savedFreeVideos);

    // Phase 14: Restore Careers
    setCareers(savedCareers);

    // Phase 15: Restore Testimonials
    setTestimonials(savedTestimonials);

    // Phase 16: Contact Us
    setContactUs(savedContactUs);

    // Phase 17: Restore Footer
    setFooterSettings(savedFooterSettings);
  };

  const openPreviewInNewTab = () => {
    if (hasUnsavedChanges) {
      notification.warning(
        "Please save your changes before opening the new-tab preview."
      );
      return;
    }

    window.open(
      "/website-preview",
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loading) {
    return (
      <div className="website-editor-loading">
        <FiRefreshCw className="we-spin" />
        Loading Website Editor...
      </div>
    );
  }

  return (
    <div className="website-editor">
      <aside className="website-editor-sidebar">
        <div className="website-editor-sidebar-top">
          <div className="website-editor-brand">
            <div className="website-editor-brand-icon">
              <FiGlobe />
            </div>

            <div>
              <strong>Website Editor</strong>
              <small>Manage your website</small>
            </div>
          </div>

          <button
            type="button"
            className="website-editor-back"
            onClick={() => navigate("/admin/dashboard")}
          >
            <FiArrowLeft />
            Back to Admin
          </button>
        </div>

        <div className="website-editor-sidebar-scroll">
          {editorSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            const isActive = activeSection === section.id;

            return (
              <div
                className={`website-editor-accordion ${
                  isActive ? "active" : ""
                }`}
                key={section.id}
              >
                <button
                  type="button"
                  className="website-editor-accordion-trigger"
                  onClick={() => handleSectionClick(section)}
                  aria-expanded={isExpanded}
                >
                  <Icon />
                  <span>{section.label}</span>
                  {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {isExpanded && (
                  <div className="website-editor-accordion-content">
                    {/* !!!!! INSERTION START: RENDER HEADER AND MENU CONTROLS !!!!! */}
                    {section.id === "header" ? (
                      <HeaderControls
                        header={header}
                        institute={institute}
                        logoUrl={logoUrl}
                        uploadingLogo={uploadingLogo}
                        logoInputKey={logoInputKey}
                        onHeaderChange={updateHeader}
                        onInstituteChange={updateInstitute}
                        onLogoUpload={handleLogoUpload}
                        onAddQuickLink={addQuickLink}
                        onUpdateQuickLink={updateQuickLink}
                        onRemoveQuickLink={removeQuickLink}

                      />
                    ) : section.id === "menu" ? (
                      <MenuControls
                        menu={menu}
                        onChange={updateMenu}
                      />
                    ) : section.id === "banner" ? (
                      <BannerControls
                        slides={bannerSlides}
                        uploading={uploadingBanner}
                        onUpload={handleBannerUpload}
                        onDelete={handleBannerDelete}
                        onReorder={handleBannerReorder}
                      />
                    ) : section.id === "categories" ? (
                      <CategoryHighlightsControls
                        items={categoryHighlights.items}
                        onChange={updateCategoryHighlights}
                        onUploadIcon={uploadCategoryHighlightIcon}
                      />
                    ) : section.id === "coursescategory" ? (
                      <CourseCategoriesControls
                        categories={availableCourseCategories}
                        selectedCategoryIds={courseCategories.selectedCategoryIds}
                        onChange={updateCourseCategories}
                      />
                    ) : section.id === "courses" ? (
                      <TrendingCoursesControls
                        courses={availableTrendingCourses}
                        selectedCourseIds={trendingCourses.selectedCourseIds}
                        onChange={updateTrendingCourses}
                      />
                    ) : section.id === "resources" ? (
                      <StudyResourcesControls
                        items={studyResources.items}
                        onChange={updateStudyResources}
                        onUploadImage={uploadStudyResourceImage}
                      />
                    ) : section.id === "certificate" ? (
                      <CertificateSectionControls
                        settings={certificateSection}
                        onChange={updateCertificateSection}
                        onUploadImage={uploadCertificateSectionImage}
                      />
                    ) : section.id === "partners" ? (
                      <PartnersControls
                        settings={partners}
                        onChange={updatePartners}
                        onUploadLogo={uploadPartnerLogo}
                      />
                    ) : section.id === "placements" ? (
                      <PlacementStoriesControls
                        settings={placementStories}
                        onChange={updatePlacementStories}
                        onUploadImage={uploadPlacementStoryImage}
                      />
                    ) : section.id === "team" ? (
                      <OurTeamControls
                        settings={team}
                        onChange={updateTeam}
                        onUploadImage={uploadTeamMemberImage}
                      />
                    ) : section.id === "videos" ? (
                      <FreeVideosControls
                        settings={freeVideos}
                        onChange={updateFreeVideos}
                      />
                    ) : section.id === "careers" ? (
                      <CareersControls
                        settings={careers}
                        onChange={updateCareers}
                      />
                    ) : section.id === "testimonials" ? (
                      <TestimonialsControls
                        settings={testimonials}
                        onChange={updateTestimonials}
                        onUploadImage={uploadTestimonialImage}
                      />
                    ) : section.id === "contact" ? (
                      <ContactUsControls
                        settings={contactUs}
                        contact={institute}
                        onChange={setContactUs}
                      />
                    ) : section.id === "footer" ? (
                      <FooterControls
                        settings={footerSettings}
                        institute={institute}
                        logoUrl={logoUrl}
                        onChange={setFooterSettings}
                        socialLinks={header.socialLinks || []}
                        onSocialLinksChange={(socialLinks) =>
                          setHeader((current) => ({
                            ...current,
                            socialLinks,
                          }))
                        }
                      />
                    ) : (
                      <div className="we-coming-soon">
                        <span>Phase {section.phase}</span>
                        <p>
                          {section.label} editor will be implemented
                          in its own development phase.
                        </p>
                      </div>
                    )}
                    {/* !!!!! INSERTION END: RENDER HEADER AND MENU CONTROLS !!!!! */}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="website-editor-sidebar-actions">
          <button
            type="button"
            className="we-save-button"
            onClick={handleSaveDraft}
            disabled={saving || uploadingLogo}
          >
            {saving ? (
              <FiRefreshCw className="we-spin" />
            ) : (
              <FiSave />
            )}
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            className="we-discard-button"
            onClick={handleDiscard}
            disabled={saving}
          >
            <FiX />
            Discard
          </button>

          <button
            type="button"
            className="we-publish-button"
            disabled
            title="Publishing will be implemented in a later phase."
          >
            <FiLock />
            Publish
          </button>
        </div>
      </aside>

      <main className="website-editor-main">
        <div className="website-editor-preview-toolbar">
          <div>
            <span>WEBSITE PREVIEW</span>
            <h1>{selectedSection?.label || "Website Editor"}</h1>
            <p>
              Changes appear here while you edit the sidebar controls.
            </p>
          </div>

          <div className="we-preview-toolbar-actions">
            <div className="we-device-controls">
              <button
                type="button"
                className={previewDevice === "desktop" ? "active" : ""}
                onClick={() => setPreviewDevice("desktop")}
              >
                <FiMonitor />
                <span>Desktop</span>
              </button>

              <button
                type="button"
                className={previewDevice === "tablet" ? "active" : ""}
                onClick={() => setPreviewDevice("tablet")}
              >
                <FiTablet />
                <span>Tablet</span>
              </button>

              <button
                type="button"
                className={previewDevice === "mobile" ? "active" : ""}
                onClick={() => setPreviewDevice("mobile")}
              >
                <FiSmartphone />
                <span>Mobile</span>
              </button>
            </div>

            <button
              type="button"
              className="we-open-preview-button"
              onClick={openPreviewInNewTab}
            >
              <FiExternalLink />
              Open Preview in New Tab
            </button>
          </div>
        </div>

        <div className="website-editor-preview-stage">
          <div
            className={`we-preview-frame we-preview-${previewDevice}`}
          >
            <div className="we-preview-browser">
              <div className="we-browser-dots">
                <span />
                <span />
                <span />
              </div>

              <div className="we-browser-address">
                <FiLock />
                <span>Saved website configuration preview</span>
              </div>
            </div>

            {/* !!!!! INSERTION START: PASS MENU TO WEBSITE PREVIEW !!!!! */}
            <WebsitePreview
              header={header}
              institute={institute}
              logoUrl={logoUrl}
              menu={menu}
              banner={bannerSlides}
              categoryHighlights={categoryHighlights.items.map((item) => ({
                ...item,
                iconUrl: item.iconUrl ? getAssetUrl(item.iconUrl) : "",
              }))}

              courseCategories={availableCourseCategories
              .filter(
                (category) =>
                  category.status === "Active" &&
                  courseCategories.selectedCategoryIds.includes(
                    String(category._id)
                  )
              )
              .map((category) => ({
                ...category,
                categoryIcon: category.categoryIcon
                  ? getAssetUrl(category.categoryIcon)
                  : "",
              }))}

              trendingCourses={trendingCourses.selectedCourseIds
              .map((selectedId) =>
                availableTrendingCourses.find(
                  (course) =>
                    String(course._id) === String(selectedId)
                )
              )
              .filter(
                (course) =>
                  course && course.status === "Published"
              )
              .map((course) => ({
                ...course,
                courseImage: course.courseImage
                  ? getAssetUrl(course.courseImage)
                  : "",
              }))}

              studyResources={studyResources.items.map((item) => ({
                ...item,
                imageUrl: item.imageUrl
                  ? getAssetUrl(item.imageUrl)
                  : "",
              }))}

              certificateSection={{
                ...certificateSection,
                imageUrl: certificateSection.imageUrl
                  ? getAssetUrl(certificateSection.imageUrl)
                  : "",
              }}

              partners={{
                ...partners,
                logos: (partners.logos || []).map((logo) => ({
                  ...logo,
                  imageUrl: logo.imageUrl
                    ? getAssetUrl(logo.imageUrl)
                    : "",
                })),
              }}

              placementStories={{
                ...placementStories,
                stories: (placementStories.stories || []).map((story) => ({
                  ...story,
                  imageUrl: story.imageUrl
                    ? getAssetUrl(story.imageUrl)
                    : "",
                })),
              }}

              team={{
                ...team,
                members: (team.members || []).map((member) => ({
                  ...member,
                  imageUrl: member.imageUrl
                    ? getAssetUrl(member.imageUrl)
                    : "",
                })),
              }}

              freeVideos={freeVideos}

              careers={careers}

              testimonials={{
                ...testimonials,
                testimonials: (testimonials.testimonials || []).map((item) => ({
                  ...item,
                  imageUrl: item.imageUrl
                    ? getAssetUrl(item.imageUrl)
                    : "",
                })),
              }}

              contactUs={contactUs}
              contact={institute}

              footerSettings={footerSettings}
            />
            {/* !!!!! INSERTION END: PASS MENU TO WEBSITE PREVIEW !!!!! */}
            
          </div>
        </div>

        <div className="website-editor-preview-footer">
          <span className="we-preview-status-dot" />
          <span>
            Live editor preview Â· Not published to the public website
          </span>

          {hasUnsavedChanges && (
            <strong>Unsaved changes</strong>
          )}
        </div>
      </main>
    </div>
  );
};

export default WebsiteEditor;
