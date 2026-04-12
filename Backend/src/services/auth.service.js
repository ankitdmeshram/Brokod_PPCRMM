const userRepository = require("../repositories/user.repository");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const { validateSigninPayload, validateSignupPayload } = require("../validators/auth.validator");
const AppError = require("../utils/app-error");
const { hashPassword, verifyPassword } = require("../utils/password");

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
      last_login: new Date(),
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

module.exports = {
  getCurrentUser,
  signin,
  signup,
};
