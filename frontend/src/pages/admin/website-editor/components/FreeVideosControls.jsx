
import { useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiEye,
  FiEyeOff,
  FiVideo,
  FiPlayCircle,
  FiExternalLink,
} from "react-icons/fi";

import notification from "../../../../utils/notification";

const MAX_VIDEOS = 20;

const createVideo = () => ({
  key: `free-video-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`,
  title: "",
  videoUrl: "",
  videoId: "",
  displayOrder: 0,
  isVisible: true,
});

const extractYouTubeId = (rawUrl) => {
  if (!rawUrl?.trim()) return "";

  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
    }

    if (
      host !== "youtube.com" &&
      host !== "m.youtube.com" &&
      host !== "youtube-nocookie.com"
    ) {
      return "";
    }

    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v") || "";
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
    }

    const match = url.pathname.match(
      /^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/
    );

    return match?.[1] || "";
  } catch {
    return "";
  }
};

export default function FreeVideosControls({
  settings,
  onChange,
}) {
  const [thumbnailErrors, setThumbnailErrors] = useState({});

  const videos = Array.isArray(settings.videos)
    ? settings.videos
    : [];

  const updateField = (field, value) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const updateVideo = (key, field, value) => {
    onChange({
      ...settings,
      videos: videos.map((video) =>
        video.key === key
          ? { ...video, [field]: value }
          : video
      ),
    });
  };

  const addVideo = () => {
    if (videos.length >= MAX_VIDEOS) {
      notification.warning(
        `You can add a maximum of ${MAX_VIDEOS} videos.`
      );
      return;
    }

    onChange({
      ...settings,
      videos: [
        ...videos,
        {
          ...createVideo(),
          displayOrder: videos.length,
        },
      ],
    });
  };

  const removeVideo = async (key) => {
    const confirmed = await notification.confirm({
      title: "Delete video?",
      text: "This video will be removed when you save the Website Editor.",
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    onChange({
      ...settings,
      videos: videos
        .filter((video) => video.key !== key)
        .map((video, index) => ({
          ...video,
          displayOrder: index,
        })),
    });
  };

  const moveVideo = (index, direction) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= videos.length) return;

    const updated = [...videos];

    [updated[index], updated[nextIndex]] = [
      updated[nextIndex],
      updated[index],
    ];

    onChange({
      ...settings,
      videos: updated.map((video, order) => ({
        ...video,
        displayOrder: order,
      })),
    });
  };

  const handleUrlChange = (key, value) => {
    const videoId = extractYouTubeId(value);

    onChange({
      ...settings,
      videos: videos.map((video) =>
        video.key === key
          ? {
              ...video,
              videoUrl: value,
              videoId,
            }
          : video
      ),
    });

    setThumbnailErrors((previous) => ({
      ...previous,
      [key]: false,
    }));
  };

  return (
    <div className="we-free-videos-controls">
      <div className="we-free-videos-intro">
        <h4>Free Videos</h4>
        <p>
          Add YouTube videos to showcase free learning content on
          your institute website.
        </p>
      </div>

      <div className="we-free-videos-enable-row">
        <div>
          <strong>Show Free Videos Section</strong>
          <span>
            Enable or hide the complete section in the website preview.
          </span>
        </div>

        <button
          type="button"
          className={`we-free-videos-toggle ${
            settings.enabled ? "active" : ""
          }`}
          onClick={() =>
            updateField("enabled", !settings.enabled)
          }
          aria-label="Toggle Free Videos section"
        >
          <span />
        </button>
      </div>

      <div className="we-free-videos-panel">
        <div className="we-free-videos-panel-heading">
          <FiVideo />
          <strong>Section Content</strong>
        </div>

        <label className="we-free-videos-field">
          Heading *
          <input
            type="text"
            maxLength={180}
            value={settings.heading || ""}
            placeholder="Free Videos"
            onChange={(event) =>
              updateField("heading", event.target.value)
            }
          />
        </label>

        <label className="we-free-videos-field">
          Highlight Text
          <input
            type="text"
            maxLength={100}
            value={settings.highlightText || ""}
            placeholder="Videos"
            onChange={(event) =>
              updateField("highlightText", event.target.value)
            }
          />
          <small>
            This exact phrase in the heading will appear in orange.
          </small>
        </label>

        <label className="we-free-videos-field">
          Section Description
          <textarea
            rows={3}
            maxLength={600}
            value={settings.description || ""}
            placeholder="Write a short introduction for your free videos..."
            onChange={(event) =>
              updateField("description", event.target.value)
            }
          />
          <small>Maximum 600 characters.</small>
        </label>
      </div>

      <div className="we-free-videos-panel">
        <div className="we-free-videos-list-heading">
          <div className="we-free-videos-panel-heading">
            <FiVideo />
            <strong>YouTube Videos</strong>
          </div>

          <span>
            {videos.length}/{MAX_VIDEOS}
          </span>
        </div>

        <button
          type="button"
          className="we-free-videos-add-button"
          onClick={addVideo}
          disabled={videos.length >= MAX_VIDEOS}
        >
          <FiPlus />
          Add Video
        </button>

        <div className="we-free-videos-url-help">
          Supported links: youtube.com/watch, youtu.be, YouTube Shorts,
          YouTube embed and live links.
        </div>

        {videos.length === 0 ? (
          <div className="we-free-videos-empty">
            <FiVideo />
            <strong>No videos added</strong>
            <span>
              Add your first YouTube video to get started.
            </span>
          </div>
        ) : (
          <div className="we-free-videos-list">
            {videos.map((video, index) => {
              const videoId = extractYouTubeId(video.videoUrl || "");
              const thumbnailUrl = videoId
                ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                : "";

              return (
                <article
                  className="we-free-video-editor-card"
                  key={video.key}
                >
                  <div className="we-free-video-card-heading">
                    <strong>Video {index + 1}</strong>

                    <div className="we-free-video-actions">
                      <button
                        type="button"
                        title="Move up"
                        disabled={index === 0}
                        onClick={() => moveVideo(index, -1)}
                      >
                        <FiChevronUp />
                      </button>

                      <button
                        type="button"
                        title="Move down"
                        disabled={index === videos.length - 1}
                        onClick={() => moveVideo(index, 1)}
                      >
                        <FiChevronDown />
                      </button>

                      <button
                        type="button"
                        title={
                          video.isVisible === false
                            ? "Show video"
                            : "Hide video"
                        }
                        onClick={() =>
                          updateVideo(
                            video.key,
                            "isVisible",
                            video.isVisible === false
                          )
                        }
                      >
                        {video.isVisible === false ? (
                          <FiEyeOff />
                        ) : (
                          <FiEye />
                        )}
                      </button>

                      <button
                        type="button"
                        title="Delete video"
                        className="danger"
                        onClick={() => removeVideo(video.key)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  <div className="we-free-video-admin-thumbnail">
                    {thumbnailUrl && !thumbnailErrors[video.key] ? (
                      <img
                        src={thumbnailUrl}
                        alt={video.title || "YouTube thumbnail"}
                        onError={() =>
                          setThumbnailErrors((previous) => ({
                            ...previous,
                            [video.key]: true,
                          }))
                        }
                      />
                    ) : (
                      <div className="we-free-video-thumbnail-placeholder">
                        <FiVideo />
                        <span>
                          {videoUrlIsInvalid(video.videoUrl)
                            ? "Enter a valid YouTube URL"
                            : "Thumbnail preview"}
                        </span>
                      </div>
                    )}

                    {videoId && (
                      <span className="we-free-video-thumbnail-play">
                        <FiPlayCircle />
                      </span>
                    )}
                  </div>

                  <label className="we-free-videos-field">
                    Video Title *
                    <input
                      type="text"
                      maxLength={180}
                      value={video.title || ""}
                      placeholder="e.g. NEET Full Course Explained"
                      onChange={(event) =>
                        updateVideo(
                          video.key,
                          "title",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="we-free-videos-field">
                    YouTube Video URL *
                    <input
                      type="url"
                      maxLength={500}
                      value={video.videoUrl || ""}
                      placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX"
                      onChange={(event) =>
                        handleUrlChange(
                          video.key,
                          event.target.value
                        )
                      }
                    />
                  </label>

                  {videoId ? (
                    <a
                      className="we-free-video-open-link"
                      href={`https://www.youtube.com/watch?v=${videoId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FiExternalLink />
                      Open YouTube video
                    </a>
                  ) : video.videoUrl?.trim() ? (
                    <div className="we-free-video-invalid">
                      Enter a valid YouTube video URL.
                    </div>
                  ) : null}

                  {video.isVisible === false && (
                    <div className="we-free-video-hidden-note">
                      This video is hidden from the website preview.
                    </div>
                  )}

                  {(!video.title?.trim() || !videoId) && (
                    <div className="we-free-video-incomplete-note">
                      Enter a video title and valid YouTube URL before saving.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="we-free-videos-note">
        <FiVideo />
        <span>
          Thumbnails are loaded automatically from YouTube. Videos play
          inside an embedded modal; they are not downloaded or stored in
          your server.
        </span>
      </div>
    </div>
  );
}

function videoUrlIsInvalid(value) {
  if (!value?.trim()) return false;
  return !extractYouTubeId(value);
}
