const authTrailRepository = require("../repositories/auth-trail.repository");
const AppError = require("../utils/app-error");

const AUTH_TRAIL_EVENT_TYPES = Object.freeze({
  SIGNIN: "signin",
  SIGNOUT: "signout",
  SIGNUP: "signup",
  TOKEN_REJECTED: "token_rejected",
});

const AUTH_TRAIL_OUTCOMES = Object.freeze({
  SUCCESS: "success",
  FAILURE: "failure",
});

const validEventTypes = new Set(Object.values(AUTH_TRAIL_EVENT_TYPES));
const validOutcomes = new Set(Object.values(AUTH_TRAIL_OUTCOMES));

const normalizeOptionalString = (value, maxLength, { lowercase = false } = {}) => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    return null;
  }

  const finalValue = lowercase ? normalizedValue.toLowerCase() : normalizedValue;
  return finalValue.slice(0, maxLength);
};

const normalizeUserId = (userId) => {
  if (userId === null || userId === undefined || userId === "") {
    return null;
  }

  const normalizedUserId = Number(userId);

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new TypeError("auth trail userId must be a positive integer or null.");
  }

  return normalizedUserId;
};

const normalizePositiveIntegerFilter = (value, label) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const normalizedValue = Number(value);

  if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
    throw new AppError(`Please provide a valid ${label}.`, 400);
  }

  return normalizedValue;
};

const normalizeFilterString = (value, label, maxLength, { lowercase = false } = {}) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue || normalizedValue.length > maxLength) {
    throw new AppError(`Please provide a valid ${label}.`, 400);
  }

  return lowercase ? normalizedValue.toLowerCase() : normalizedValue;
};

const normalizeDateFilter = (value, label) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const normalizedDate = new Date(value);

  if (Number.isNaN(normalizedDate.getTime())) {
    throw new AppError(`Please provide a valid ${label} date.`, 400);
  }

  return normalizedDate;
};

const mapAuthTrail = (trail) => ({
  id: trail.id,
  userId: trail.user_id ?? null,
  attemptedEmail: trail.attempted_email ?? null,
  eventType: trail.event_type,
  outcome: trail.outcome,
  failureReason: trail.failure_reason ?? null,
  ipAddress: trail.ip_address ?? null,
  userAgent: trail.user_agent ?? null,
  requestId: trail.request_id ?? null,
  sessionId: trail.session_id ?? null,
  createdAt: trail.created_at,
});

const getAuthTrails = async (filters = {}) => {
  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 10);

  if (!Number.isInteger(page) || page <= 0) {
    throw new AppError("Please provide a valid page number.", 400);
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new AppError("Please provide a valid limit between 1 and 100.", 400);
  }

  const search = normalizeFilterString(filters.search, "search value", 255, {
    lowercase: true,
  });
  const eventType = normalizeFilterString(filters.eventType, "eventType", 50, {
    lowercase: true,
  });
  const outcome = normalizeFilterString(filters.outcome, "outcome", 20, {
    lowercase: true,
  });

  if (eventType && !validEventTypes.has(eventType)) {
    throw new AppError(
      `eventType must be one of: ${[...validEventTypes].join(", ")}.`,
      400
    );
  }

  if (outcome && !validOutcomes.has(outcome)) {
    throw new AppError(`outcome must be one of: ${[...validOutcomes].join(", ")}.`, 400);
  }

  const createdAt = normalizeDateFilter(filters.createdAt, "createdAt");
  const createdFrom = normalizeDateFilter(filters.createdFrom, "createdFrom");
  const createdTo = normalizeDateFilter(filters.createdTo, "createdTo");

  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw new AppError("createdFrom cannot be later than createdTo.", 400);
  }

  const normalizedFilters = {
    id: normalizePositiveIntegerFilter(filters.id, "id"),
    userId: normalizePositiveIntegerFilter(filters.userId, "userId"),
    search,
    searchUserId: /^\d+$/.test(search || "") ? Number(search) : undefined,
    attemptedEmail: normalizeFilterString(
      filters.attemptedEmail,
      "attemptedEmail",
      255,
      { lowercase: true }
    ),
    eventType,
    outcome,
    failureReason: normalizeFilterString(filters.failureReason, "failureReason", 100, {
      lowercase: true,
    }),
    ipAddress: normalizeFilterString(filters.ipAddress, "ipAddress", 45),
    userAgent: normalizeFilterString(filters.userAgent, "userAgent", 65535),
    requestId: normalizeFilterString(filters.requestId, "requestId", 100),
    sessionId: normalizeFilterString(filters.sessionId, "sessionId", 100),
    createdAt,
    createdFrom,
    createdTo,
    limit,
    offset: (page - 1) * limit,
  };

  const [authTrails, total] = await Promise.all([
    authTrailRepository.findAll(normalizedFilters),
    authTrailRepository.countAll(normalizedFilters),
  ]);

  return {
    authTrails: authTrails.map(mapAuthTrail),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const saveAuthTrail = async (trail, trx) => {
  const eventType = normalizeOptionalString(trail?.eventType, 50, { lowercase: true });
  const outcome = normalizeOptionalString(trail?.outcome, 20, { lowercase: true });

  if (!validEventTypes.has(eventType)) {
    throw new TypeError(
      `auth trail eventType must be one of: ${[...validEventTypes].join(", ")}.`
    );
  }

  if (!validOutcomes.has(outcome)) {
    throw new TypeError(
      `auth trail outcome must be one of: ${[...validOutcomes].join(", ")}.`
    );
  }

  return authTrailRepository.create(
    {
      userId: normalizeUserId(trail?.userId),
      attemptedEmail: normalizeOptionalString(trail?.attemptedEmail, 255, {
        lowercase: true,
      }),
      eventType,
      outcome,
      failureReason: normalizeOptionalString(trail?.failureReason, 100, {
        lowercase: true,
      }),
      ipAddress: normalizeOptionalString(trail?.ipAddress, 45),
      userAgent: normalizeOptionalString(trail?.userAgent, 65535),
      requestId: normalizeOptionalString(trail?.requestId, 100),
      sessionId: normalizeOptionalString(trail?.sessionId, 100),
    },
    trx
  );
};

module.exports = {
  AUTH_TRAIL_EVENT_TYPES,
  AUTH_TRAIL_OUTCOMES,
  getAuthTrails,
  saveAuthTrail,
};
