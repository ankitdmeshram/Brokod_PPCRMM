const slugify = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "workspace";

const buildTimestampedSlug = (baseSlug, timestamp = Date.now()) =>
  `${baseSlug}-${timestamp}`;

module.exports = {
  buildTimestampedSlug,
  slugify,
};
