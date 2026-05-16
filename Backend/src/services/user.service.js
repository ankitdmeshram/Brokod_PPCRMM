const { getDb } = require("../config/database");
const AppError = require("../utils/app-error");
const userRepository = require("../repositories/user.repository");
const { toUtcIsoString } = require("../utils/time");

const mapUser = (user) => ({
  id: user.id,
  firstName: user.first_name ?? user.firstName,
  lastName: user.last_name ?? user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: Boolean(user.is_active ?? user.isActive),
  lastLogin: user.last_login ?? user.lastLogin ?? null,
});

const databaseExportTables = [
  "users",
  "workspaces",
  "workspace_users",
  "projects",
  "project_users",
  "tasks",
  "task_comments",
  "task_activity_logs",
];

const getUsers = async (filters = {}) => {
  const normalizedFilters = {};
  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 10);

  if (!Number.isInteger(page) || page <= 0) {
    throw new AppError("Please provide a valid page number.", 400);
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new AppError("Please provide a valid limit between 1 and 100.", 400);
  }

  if (filters.search) {
    normalizedFilters.search = String(filters.search).trim();
  }

  normalizedFilters.limit = limit;
  normalizedFilters.offset = (page - 1) * limit;

  const [users, total] = await Promise.all([
    userRepository.findAll(normalizedFilters),
    userRepository.countAll(normalizedFilters),
  ]);

  return {
    users: users.map(mapUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const exportDatabaseAsJson = async () => {
  const db = getDb();
  const exportedAt = toUtcIsoString();
  const tableEntries = await Promise.all(
    databaseExportTables.map(async (tableName) => {
      const rows = await db(tableName).select("*").orderBy("id", "asc");

      return [tableName, rows];
    })
  );

  const tables = Object.fromEntries(tableEntries);
  const summary = Object.fromEntries(
    tableEntries.map(([tableName, rows]) => [tableName, rows.length])
  );

  return {
    fileName: `database-export-${exportedAt.replace(/[:.]/g, "-")}.json`,
    content: {
      exportedAt,
      tableCount: databaseExportTables.length,
      totalRecords: Object.values(summary).reduce((count, value) => count + value, 0),
      summary,
      tables,
    },
  };
};

const updateUser = async (userId, payload, currentUserId) => {
  const normalizedUserId = Number(userId);

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const user = await userRepository.findById(normalizedUserId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const firstName = String(payload?.firstName || "").trim();
  const lastName = String(payload?.lastName || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const phone = String(payload?.phone || "").trim();
  const role = String(payload?.role || "").trim().toLowerCase();

  if (!firstName || !lastName || !email || !phone || !role) {
    throw new AppError("firstName, lastName, email, phone, and role are required.", 400);
  }

  const existingUserWithEmail = await userRepository.findByEmail(email);

  if (existingUserWithEmail && Number(existingUserWithEmail.id) !== normalizedUserId) {
    throw new AppError("An account with this email already exists.", 409);
  }

  if (normalizedUserId === Number(currentUserId) && role !== String(user.role || "").toLowerCase()) {
    throw new AppError("You cannot change your own role.", 400);
  }

  await userRepository.updateById(normalizedUserId, {
    firstName,
    lastName,
    email,
    phone,
    role,
  });

  const updatedUser = await userRepository.findById(normalizedUserId);
  return mapUser(updatedUser);
};

const updateUserStatus = async (userId, payload, currentUserId) => {
  const normalizedUserId = Number(userId);

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  if (payload?.isActive === undefined) {
    throw new AppError("isActive is required.", 400);
  }

  const user = await userRepository.findById(normalizedUserId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (normalizedUserId === Number(currentUserId) && !payload.isActive) {
    throw new AppError("You cannot deactivate your own account.", 400);
  }

  await userRepository.updateById(normalizedUserId, {
    isActive: Boolean(payload.isActive),
  });

  const updatedUser = await userRepository.findById(normalizedUserId);
  return mapUser(updatedUser);
};

const deleteUser = async (userId, currentUserId) => {
  const normalizedUserId = Number(userId);

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const user = await userRepository.findById(normalizedUserId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (normalizedUserId === Number(currentUserId)) {
    throw new AppError("You cannot delete your own account.", 400);
  }

  await userRepository.deleteById(normalizedUserId);
};

module.exports = {
  deleteUser,
  exportDatabaseAsJson,
  getUsers,
  updateUser,
  updateUserStatus,
};
