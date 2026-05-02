const slugify = (value = "", fallback = "workspace") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || fallback;

const buildTimestampedSlug = (baseSlug, timestamp = Date.now()) =>
  `${baseSlug}-${timestamp}`;

module.exports = {
  buildTimestampedSlug,
  slugify,
};
