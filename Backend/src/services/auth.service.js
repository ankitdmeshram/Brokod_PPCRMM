const userRepository = require("../repositories/user.repository");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const {
  validateSigninPayload,
  validateSignupPayload,
  validateUpdateProfilePayload,
} = require("../validators/auth.validator");
const AppError = require("../utils/app-error");
const { hashPassword, verifyPassword } = require("../utils/password");
const { toUtcDate } = require("../utils/time");

const mapUser = (user) => ({
  id: user.id,
  firstName: user.first_name ?? user.firstName,
  lastName: user.last_name ?? user.lastName,
  email: user.email,
  phone: user.phone,
  timeZone: user.timezone ?? user.timeZone ?? "UTC",
  role: user.role,
  isActive: Boolean(user.is_active ?? user.isActive),
  createdAt: user.created_at ?? user.createdAt ?? null,
  updatedAt: user.updated_at ?? user.updatedAt ?? null,
  lastLogin: user.last_login ?? user.lastLogin ?? null,
});

const signup = async (payload) => {
  const { firstName, lastName, email, phone, password } = validateSignupPayload(payload);
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const hashedPassword = await hashPassword(password);
  let userId;

  try {
    userId = await userRepository.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("An account with this email already exists.", 409);
    }

    throw error;
  }

  return mapUser({
    id: userId,
    firstName,
    lastName,
    email,
    phone,
    role: "user",
    isActive: true,
    lastLogin: null,
  });
};

const signin = async (payload) => {
  const { email, password } = validateSigninPayload(payload);
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.is_active) {
    throw new AppError("Your account is inactive. Please contact support.", 403);
  }

  const passwordMatches = await verifyPassword(password, user.password);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password.", 401);
  }

  await userRepository.updateLastLogin(user.id);

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    message: "Signin successful.",
    token,
    user: mapUser({
      ...user,
      last_login: toUtcDate(),
    }),
  };
};

const getCurrentUser = async (userId) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (!user.is_active) {
    throw new AppError("Your account is inactive. Please contact support.", 403);
  }

  return mapUser(user);
};

const updateCurrentUser = async (userId, payload) => {
  const normalizedUserId = Number(userId);

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const existingUser = await userRepository.findById(normalizedUserId);

  if (!existingUser) {
    throw new AppError("User not found.", 404);
  }

  if (!existingUser.is_active) {
    throw new AppError("Your account is inactive. Please contact support.", 403);
  }

  const { firstName, lastName, email, phone, timeZone } = validateUpdateProfilePayload(payload);
  const existingUserWithEmail = await userRepository.findByEmail(email);

  if (existingUserWithEmail && Number(existingUserWithEmail.id) !== normalizedUserId) {
    throw new AppError("An account with this email already exists.", 409);
  }

  await userRepository.updateById(normalizedUserId, {
    firstName,
    lastName,
    email,
    phone,
    timeZone,
  });

  const updatedUser = await userRepository.findById(normalizedUserId);
  return mapUser(updatedUser);
};

module.exports = {
  getCurrentUser,
  signin,
  signup,
  updateCurrentUser,
};
