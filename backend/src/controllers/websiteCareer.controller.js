
import WebsiteCareerSettings from "../models/WebsiteCareerSettings.js";

const MAX_JOBS = 50;
const MAX_SKILLS = 12;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const getDefaults = () => ({
  key: "default",
  enabled: true,
  heading: "Join Our Growing Team",
  highlightText: "Team",
  description:
    "Explore exciting career opportunities and be part of the team that's revolutionizing education technology.",
  jobs: [],
});

const getOrCreateSettings = async () => {
  let settings = await WebsiteCareerSettings.findOne({
    key: "default",
  });

  if (!settings) {
    settings = await WebsiteCareerSettings.create(getDefaults());
  }

  return settings;
};

const isValidApplyUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const serializeSettings = (settings, publicOnly = false) => {
  const source = settings?.toObject
    ? settings.toObject()
    : settings || {};

  let jobs = Array.isArray(source.jobs)
    ? [...source.jobs].sort(
        (a, b) =>
          (a.displayOrder || 0) - (b.displayOrder || 0)
      )
    : [];

  if (publicOnly) {
    jobs = jobs.filter(
      (job) => job.isVisible !== false
    );
  }

  return {
    ...getDefaults(),
    ...source,
    jobs: jobs.map((job, index) => ({
      key: job.key,
      team: job.team,
      employmentType: job.employmentType,
      workMode: job.workMode,
      isUrgent: job.isUrgent === true,
      position: job.position,
      location: job.location,
      postedAt: job.postedAt,
      skills: Array.isArray(job.skills) ? job.skills : [],
      applyUrl: job.applyUrl,
      displayOrder: index,
      isVisible: job.isVisible !== false,
    })),
  };
};

// Admin: get Careers settings.
export const getWebsiteCareerSettings = async (
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

// Admin: update Careers settings and job postings.
export const updateWebsiteCareerSettings = async (
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

    if (!Array.isArray(body.jobs)) {
      return sendError(
        res,
        400,
        "Jobs must be provided as an array."
      );
    }

    if (body.jobs.length > MAX_JOBS) {
      return sendError(
        res,
        400,
        `Maximum ${MAX_JOBS} job postings are allowed.`
      );
    }

    const existingSettings = await WebsiteCareerSettings.findOne({
      key: "default",
    }).lean();

    const previousJobs = new Map(
      (existingSettings?.jobs || []).map((job) => [
        job.key,
        job,
      ])
    );

    const keys = new Set();
    const jobs = [];

    for (let index = 0; index < body.jobs.length; index += 1) {
      const job = body.jobs[index] || {};

      const key = String(job.key || "").trim();
      const team = String(job.team || "").trim();
      const employmentType = String(
        job.employmentType || ""
      ).trim();
      const workMode = String(job.workMode || "").trim();
      const position = String(job.position || "").trim();
      const location = String(job.location || "").trim();
      const applyUrl = String(job.applyUrl || "").trim();

      if (!key || key.length > 100 || keys.has(key)) {
        return sendError(
          res,
          400,
          `Job ${index + 1}: every job must have a unique valid key.`
        );
      }

      keys.add(key);

      if (!team || team.length > 80) {
        return sendError(
          res,
          400,
          `Job ${index + 1}: select a valid team.`
        );
      }

      if (
        !["Full-time", "Part-time", "Contract", "Internship"]
          .includes(employmentType)
      ) {
        return sendError(
          res,
          400,
          `Job ${index + 1}: select a valid employment type.`
        );
      }

      if (!["On-site", "Remote", "Hybrid"].includes(workMode)) {
        return sendError(
          res,
          400,
          `Job ${index + 1}: select a valid work mode.`
        );
      }

      if (!position || position.length > 180) {
        return sendError(
          res,
          400,
          `Job ${index + 1}: position must contain 1 to 180 characters.`
        );
      }

      if (!location || location.length > 160) {
        return sendError(
          res,
          400,
          `Job ${index + 1}: location must contain 1 to 160 characters.`
        );
      }

      if (!isValidApplyUrl(applyUrl) || applyUrl.length > 1000) {
        return sendError(
          res,
          400,
          `Job ${index + 1}: enter a valid HTTP or HTTPS application URL.`
        );
      }

      const skills = Array.isArray(job.skills)
        ? [...new Set(
            job.skills
              .map((skill) => String(skill || "").trim())
              .filter(Boolean)
          )]
        : [];

      if (
        skills.length > MAX_SKILLS ||
        skills.some((skill) => skill.length > 50)
      ) {
        return sendError(
          res,
          400,
          `Job ${index + 1}: maximum 12 skills are allowed, with 50 characters each.`
        );
      }

      const previousJob = previousJobs.get(key);

      // Keep the original posted date when editing an existing job.
      const postedAt = previousJob?.postedAt || new Date();

      jobs.push({
        key,
        team,
        employmentType,
        workMode,
        isUrgent: job.isUrgent === true,
        position,
        location,
        postedAt,
        skills,
        applyUrl,
        displayOrder: index,
        isVisible: job.isVisible !== false,
      });
    }

    const settings = await WebsiteCareerSettings.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          enabled,
          heading,
          highlightText,
          description,
          jobs,
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
      message: "Careers settings saved successfully.",
      data: {
        settings: serializeSettings(settings),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public: return enabled Careers section and visible jobs.
export const getPublicWebsiteCareerSettings = async (
  _req,
  res,
  next
) => {
  try {
    const settings = await getOrCreateSettings();
    const data = serializeSettings(settings, true);

    if (!data.enabled || data.jobs.length === 0) {
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
