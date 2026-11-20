
import WebsiteFreeVideoSettings from "../models/WebsiteFreeVideoSettings.js";

const MAX_VIDEOS = 20;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getDefaults = () => ({
  key: "default",
  enabled: true,
  heading: "Free Videos",
  highlightText: "Videos",
  description:
    "Watch our most popular and high-quality free videos to boost your learning journey.",
  videos: [],
});

// Accept standard YouTube, short, Shorts, embed and live links.
const extractYouTubeId = (rawUrl) => {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return null;
  }

  try {
    const url = new URL(rawUrl.trim());

    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
    }

    if (
      host !== "youtube.com" &&
      host !== "m.youtube.com" &&
      host !== "youtube-nocookie.com"
    ) {
      return null;
    }

    let id = "";

    if (url.pathname === "/watch") {
      id = url.searchParams.get("v") || "";
    } else {
      const match = url.pathname.match(
        /^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/
      );

      id = match?.[1] || "";
    }

    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
};

const getCanonicalUrl = (videoId) =>
  `https://www.youtube.com/watch?v=${videoId}`;

const getOrCreateSettings = async () => {
  let settings = await WebsiteFreeVideoSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteFreeVideoSettings.create(getDefaults());
  }

  return settings;
};

const serializeSettings = (settings, publicOnly = false) => {
  const source = settings?.toObject
    ? settings.toObject()
    : settings || {};

  let videos = Array.isArray(source.videos)
    ? [...source.videos].sort(
        (a, b) =>
          (a.displayOrder || 0) - (b.displayOrder || 0)
      )
    : [];

  if (publicOnly) {
    videos = videos.filter(
      (video) => video.isVisible !== false
    );
  }

  return {
    ...getDefaults(),
    ...source,
    videos: videos.map((video, index) => ({
      key: video.key,
      title: video.title,
      videoId: video.videoId,
      videoUrl: video.videoUrl,
      displayOrder: index,
      isVisible: video.isVisible !== false,
    })),
  };
};

// Admin: get Free Videos settings.
export const getWebsiteFreeVideoSettings = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      data: {
        settings: serializeSettings(settings),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: save Free Videos settings.
export const updateWebsiteFreeVideoSettings = async (
  req,
  res,
  next
) => {
  try {
    const body = req.body || {};

    const enabled = body.enabled !== false;
    const heading = String(body.heading || "").trim();
    const highlightText = String(
      body.highlightText || ""
    ).trim();
    const description = String(
      body.description || ""
    ).trim();

    if (!heading || heading.length > 180) {
      return sendError(
        res,
        400,
        "Heading must contain 1 to 180 characters."
      );
    }

    if (highlightText.length > 100) {
      return sendError(
        res,
        400,
        "Highlight text cannot exceed 100 characters."
      );
    }

    if (description.length > 600) {
      return sendError(
        res,
        400,
        "Description cannot exceed 600 characters."
      );
    }

    if (!Array.isArray(body.videos)) {
      return sendError(
        res,
        400,
        "Videos must be provided as an array."
      );
    }

    if (body.videos.length > MAX_VIDEOS) {
      return sendError(
        res,
        400,
        `Maximum ${MAX_VIDEOS} free videos are allowed.`
      );
    }

    const keys = new Set();
    const videos = [];

    for (let index = 0; index < body.videos.length; index += 1) {
      const video = body.videos[index] || {};

      const key = String(video.key || "").trim();
      const title = String(video.title || "").trim();
      const videoUrl = String(video.videoUrl || "").trim();

      if (
        !key ||
        key.length > 100 ||
        keys.has(key)
      ) {
        return sendError(
          res,
          400,
          "Every video must have a unique valid key."
        );
      }

      keys.add(key);

      if (!title || title.length > 180) {
        return sendError(
          res,
          400,
          `Video ${index + 1}: title must contain 1 to 180 characters.`
        );
      }

      const videoId = extractYouTubeId(videoUrl);

      if (!videoId) {
        return sendError(
          res,
          400,
          `Video ${index + 1}: enter a valid YouTube video URL.`
        );
      }

      videos.push({
        key,
        title,
        videoId,
        videoUrl: getCanonicalUrl(videoId),
        displayOrder: index,
        isVisible: video.isVisible !== false,
      });
    }

    const settings = await WebsiteFreeVideoSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          enabled,
          heading,
          highlightText,
          description,
          videos,
          updatedBy: req.user._id,
        },
        $setOnInsert: {
          key: "default",
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Free Videos settings saved successfully.",
      data: {
        settings: serializeSettings(settings),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public: return enabled section and visible videos.
export const getPublicWebsiteFreeVideos = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();
    const data = serializeSettings(settings, true);

    if (!data.enabled || data.videos.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          settings: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        settings: data,
      },
    });
  } catch (error) {
    next(error);
  }
};
