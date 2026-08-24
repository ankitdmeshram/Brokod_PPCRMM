const { getDb } = require("../config/database");

const authTrailColumns = [
  "id",
  "user_id",
  "attempted_email",
  "event_type",
  "outcome",
  "failure_reason",
  "ip_address",
  "user_agent",
  "request_id",
  "session_id",
  "created_at",
];

const applyFilters = (query, filters = {}) => {
  if (filters.search) {
    query.andWhere((builder) => {
      builder.where("attempted_email", "like", `%${filters.search}%`);

      if (filters.searchUserId) {
        builder.orWhere("user_id", filters.searchUserId);
      }
    });
  }

  const exactFilters = {
    id: filters.id,
    user_id: filters.userId,
    event_type: filters.eventType,
    outcome: filters.outcome,
    ip_address: filters.ipAddress,
    request_id: filters.requestId,
    session_id: filters.sessionId,
    created_at: filters.createdAt,
  };

  Object.entries(exactFilters).forEach(([column, value]) => {
    if (value !== undefined) {
      query.andWhere(column, value);
    }
  });

  const partialFilters = {
    attempted_email: filters.attemptedEmail,
    failure_reason: filters.failureReason,
    user_agent: filters.userAgent,
  };

  Object.entries(partialFilters).forEach(([column, value]) => {
    if (value !== undefined) {
      query.andWhere(column, "like", `%${value}%`);
    }
  });

  if (filters.createdFrom) {
    query.andWhere("created_at", ">=", filters.createdFrom);
  }

  if (filters.createdTo) {
    query.andWhere("created_at", "<=", filters.createdTo);
  }

  return query;
};

const create = async (
  {
    userId,
    attemptedEmail,
    eventType,
    outcome,
    failureReason,
    ipAddress,
    userAgent,
    requestId,
    sessionId,
  },
  trx = getDb()
) => {
  const result = await trx("auth_trails").insert({
    user_id: userId,
    attempted_email: attemptedEmail,
    event_type: eventType,
    outcome,
    failure_reason: failureReason,
    ip_address: ipAddress,
    user_agent: userAgent,
    request_id: requestId,
    session_id: sessionId,
  });

  return result[0];
};

const findAll = async (filters = {}, trx = getDb()) => {
  const query = trx("auth_trails").select(...authTrailColumns);

  applyFilters(query, filters);

  query.limit(filters.limit).offset(filters.offset);
  return query.orderBy("created_at", "desc").orderBy("id", "desc");
};

const countAll = async (filters = {}, trx = getDb()) => {
  const query = trx("auth_trails").count({ count: "*" }).first();

  applyFilters(query, filters);

  const result = await query;
  return Number(result?.count || 0);
};

module.exports = {
  countAll,
  create,
  findAll,
};
