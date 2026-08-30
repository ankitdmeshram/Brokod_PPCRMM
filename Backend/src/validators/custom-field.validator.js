const AppError = require("../utils/app-error");

const allowedCustomFieldTypes = new Set(["text", "number", "date", "select", "checkbox"]);
const MAX_LABEL_LENGTH = 100;
const MAX_OPTIONS = 50;

const normalizeOptions = (rawOptions) => {
  if (!Array.isArray(rawOptions)) {
    return null;
  }

  const options = rawOptions
    .map((option) => String(option ?? "").trim())
    .filter(Boolean)
    .slice(0, MAX_OPTIONS);

  return options;
};

const validateCreateCustomFieldPayload = (payload = {}) => {
  const label = String(payload?.label || "").trim();
  const fieldType = String(payload?.fieldType || "").trim().toLowerCase();

  if (!label) {
    throw new AppError("label is required.", 400);
  }

  if (label.length > MAX_LABEL_LENGTH) {
    throw new AppError(`label must be ${MAX_LABEL_LENGTH} characters or fewer.`, 400);
  }

  if (!allowedCustomFieldTypes.has(fieldType)) {
    throw new AppError(
      `fieldType must be one of: ${[...allowedCustomFieldTypes].join(", ")}.`,
      400
    );
  }

  let options = null;

  if (fieldType === "select") {
    options = normalizeOptions(payload?.options);

    if (!options || options.length === 0) {
      throw new AppError("options must be a non-empty array when fieldType is select.", 400);
    }
  }

  return { label, fieldType, options };
};

const validateUpdateCustomFieldPayload = (payload = {}, currentField) => {
  const updates = {};

  if (payload?.label !== undefined) {
    const label = String(payload.label || "").trim();

    if (!label) {
      throw new AppError("label cannot be empty.", 400);
    }

    if (label.length > MAX_LABEL_LENGTH) {
      throw new AppError(`label must be ${MAX_LABEL_LENGTH} characters or fewer.`, 400);
    }

    updates.label = label;
  }

  if (payload?.fieldType !== undefined) {
    const fieldType = String(payload.fieldType || "").trim().toLowerCase();

    if (!allowedCustomFieldTypes.has(fieldType)) {
      throw new AppError(
        `fieldType must be one of: ${[...allowedCustomFieldTypes].join(", ")}.`,
        400
      );
    }

    updates.fieldType = fieldType;
  }

  if (payload?.options !== undefined) {
    // A type change in the same request takes priority over the field's
    // existing type when deciding whether options are still required.
    const fieldType =
      updates.fieldType ?? currentField?.field_type ?? currentField?.fieldType;
    const options = normalizeOptions(payload.options);

    if (fieldType === "select" && (!options || options.length === 0)) {
      throw new AppError("options must be a non-empty array when fieldType is select.", 400);
    }

    updates.options = fieldType === "select" ? options : null;
  } else if (
    updates.fieldType !== undefined &&
    updates.fieldType !== "select" &&
    (currentField?.field_type ?? currentField?.fieldType) === "select"
  ) {
    // Switching away from select without new options clears the stale list.
    updates.options = null;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Provide at least one field to update.", 400);
  }

  return updates;
};

module.exports = {
  allowedCustomFieldTypes,
  validateCreateCustomFieldPayload,
  validateUpdateCustomFieldPayload,
};
