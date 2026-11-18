
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
        JSON.stringify(savedStudyResources);


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
      ] = await Promise.all([
        websiteEditorService.getHeaderSettings(),
        instituteSettingsService.getSettings(),
        websiteEditorService.getMenuSettings(),
        websiteEditorService.getBannerSettings(),
        websiteEditorService.getCategoryHighlights(),
        websiteEditorService.getCourseCategorySettings(),
        websiteEditorService.getTrendingCourseSettings(),
        websiteEditorService.getStudyResourcesSettings(),
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
      text: "Your unsaved Header, Topbar, Menu, Category Highlights, Course Categories, Trending Courses and Study Resources changes will be discarded.",
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
                        onAddSocialLink={addSocialLink}
                        onUpdateSocialLink={updateSocialLink}
                        onRemoveSocialLink={removeSocialLink}
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
