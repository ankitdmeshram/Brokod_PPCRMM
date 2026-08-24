const { getDb } = require("../config/database");

const findByEmail = async (email, trx = getDb()) => {
  return trx("users")
    .select(
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "password",
      "timezone",
      "created_at",
      "updated_at",
      "last_login",
      "is_active",
      "role"
    )
    .where({ email })
    .first();
};

const findById = async (id, trx = getDb()) => {
  return trx("users")
    .select(
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "password",
      "timezone",
      "created_at",
      "updated_at",
      "last_login",
      "is_active",
      "role"
    )
    .where({ id })
    .first();
};

const baseUserColumns = [
  "id",
  "first_name",
  "last_name",
  "email",
  "phone",
  "timezone",
  "created_at",
  "updated_at",
  "last_login",
  "is_active",
  "role",
];

const applyUserFilters = (query, filters = {}) => {
  if (filters.search) {
    query.andWhere((builder) => {
      builder
        .where("first_name", "like", `%${filters.search}%`)
        .orWhere("last_name", "like", `%${filters.search}%`)
        .orWhere("email", "like", `%${filters.search}%`)
        .orWhere("role", "like", `%${filters.search}%`);
    });
  }

  return query;
};

const findAll = async (filters = {}, trx = getDb()) => {
  const query = trx("users").select(...baseUserColumns);

  applyUserFilters(query, filters);

  if (filters.limit) {
    query.limit(filters.limit);
  }

  if (filters.offset) {
    query.offset(filters.offset);
  }

  return query.orderBy("id", "desc");
};

const countAll = async (filters = {}, trx = getDb()) => {
  const query = trx("users").count({ count: "*" }).first();

  applyUserFilters(query, filters);

  const result = await query;
  return Number(result?.count || 0);
};

const create = async ({ firstName, lastName, email, phone, password }, trx = getDb()) => {
  const result = await trx("users").insert({
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    password,
    timezone: "UTC",
    is_active: true,
    role: "user",
  });

  return result[0];
};

const updateLastLogin = async (userId, trx = getDb()) => {
  await trx("users")
    .where({ id: userId })
    .update({
      last_login: trx.fn.now(),
    });
};

const updateById = async (userId, updates, trx = getDb()) => {
  const mappedUpdates = {};

  if (updates.firstName !== undefined) {
    mappedUpdates.first_name = updates.firstName;
  }

  if (updates.lastName !== undefined) {
    mappedUpdates.last_name = updates.lastName;
  }

  if (updates.email !== undefined) {
    mappedUpdates.email = updates.email;
  }

  if (updates.phone !== undefined) {
    mappedUpdates.phone = updates.phone;
  }

  if (updates.timeZone !== undefined) {
    mappedUpdates.timezone = updates.timeZone;
  }

  if (updates.isActive !== undefined) {
    mappedUpdates.is_active = Boolean(updates.isActive);
  }

  if (updates.role !== undefined) {
    mappedUpdates.role = updates.role;
  }

  return trx("users").where({ id: userId }).update(mappedUpdates);
};

const deleteById = async (userId) => {
  return getDb()("users").where({ id: userId }).delete();
};

module.exports = {
  create,
  countAll,
  findByEmail,
  findAll,
  findById,
  deleteById,
  updateById,
  updateLastLogin,
};
