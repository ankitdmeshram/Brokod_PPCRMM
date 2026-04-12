const { getDb } = require("../config/database");

const findByEmail = async (email) => {
  return getDb()("users")
    .select(
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "password",
      "last_login",
      "is_active",
      "role"
    )
    .where({ email })
    .first();
};

const findById = async (id) => {
  return getDb()("users")
    .select(
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "password",
      "last_login",
      "is_active",
      "role"
    )
    .where({ id })
    .first();
};

const create = async ({ firstName, lastName, email, phone, password }) => {
  const result = await getDb()("users").insert({
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    password,
    is_active: true,
    role: "user",
  });

  return result[0];
};

const updateLastLogin = async (userId) => {
  await getDb()("users")
    .where({ id: userId })
    .update({
      last_login: getDb().fn.now(),
    });
};

module.exports = {
  create,
  findByEmail,
  findById,
  updateLastLogin,
};
