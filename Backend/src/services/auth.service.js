const crypto = require("crypto");
const userRepository = require("../repositories/user.repository");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const { getDb } = require("../config/database");
const {
  AUTH_TRAIL_EVENT_TYPES,
  AUTH_TRAIL_OUTCOMES,
  saveAuthTrail,
} = require("./auth-trail.service");
const {
  validateSigninPayload,
  validateSignupPayload,
  validateUpdateProfilePayload,
} = require("../validators/auth.validator");
const AppError = require("../utils/app-error");
const { invalidateUserCache } = require("../utils/auth-user-cache");
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

const saveAuthenticationTrail = (
  eventType,
  trailContext,
  { userId = null, email, outcome, failureReason = null, sessionId = null },
  trx
) =>
  saveAuthTrail(
    {
      userId,
      attemptedEmail: email,
      eventType,
      outcome,
      failureReason,
      ipAddress: trailContext.ipAddress,
      userAgent: trailContext.userAgent,
      requestId: trailContext.requestId,
      sessionId,
    },
    trx
  );

const signup = async (payload, trailContext = {}) => {
  const saveSignupTrail = (details, trx) =>
    saveAuthenticationTrail(AUTH_TRAIL_EVENT_TYPES.SIGNUP, trailContext, details, trx);

  let signupPayload;

  try {
    signupPayload = validateSignupPayload(payload);
  } catch (error) {
    await saveSignupTrail({
      email: payload?.email,
      outcome: AUTH_TRAIL_OUTCOMES.FAILURE,
      failureReason: "invalid_payload",
    });
    throw error;
  }

  const { firstName, lastName, email, phone, password } = signupPayload;
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    await saveSignupTrail({
      userId: existingUser.id,
      email,
      outcome: AUTH_TRAIL_OUTCOMES.FAILURE,
      failureReason: "email_already_exists",
    });
    throw new AppError("An account with this email already exists.", 409);
  }

  const hashedPassword = await hashPassword(password);
  let userId;

  try {
    await getDb().transaction(async (trx) => {
      userId = await userRepository.create(
        {
          firstName,
          lastName,
          email,
          phone,
          password: hashedPassword,
        },
        trx
      );

      await saveSignupTrail(
        {
          userId,
          email,
          outcome: AUTH_TRAIL_OUTCOMES.SUCCESS,
        },
        trx
      );
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const duplicateUser = await userRepository.findByEmail(email);
      await saveSignupTrail({
        userId: duplicateUser?.id,
        email,
        outcome: AUTH_TRAIL_OUTCOMES.FAILURE,
        failureReason: "email_already_exists",
      });
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

const signin = async (payload, trailContext = {}) => {
  const saveSigninTrail = (details, trx) =>
    saveAuthenticationTrail(AUTH_TRAIL_EVENT_TYPES.SIGNIN, trailContext, details, trx);

  let credentials;

  try {
    credentials = validateSigninPayload(payload);
  } catch (error) {
    await saveSigninTrail({
      email: payload?.email,
      outcome: AUTH_TRAIL_OUTCOMES.FAILURE,
      failureReason: "invalid_payload",
    });
    throw error;
  }

  const { email, password } = credentials;
  const user = await userRepository.findByEmail(email);

  if (!user) {
    await saveSigninTrail({
      email,
      outcome: AUTH_TRAIL_OUTCOMES.FAILURE,
      failureReason: "invalid_credentials",
    });
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.is_active) {
    await saveSigninTrail({
      userId: user.id,
      email,
      outcome: AUTH_TRAIL_OUTCOMES.FAILURE,
      failureReason: "inactive_user",
    });
    throw new AppError("Your account is inactive. Please contact support.", 403);
  }

  const passwordMatches = await verifyPassword(password, user.password);

  if (!passwordMatches) {
    await saveSigninTrail({
      userId: user.id,
      email,
      outcome: AUTH_TRAIL_OUTCOMES.FAILURE,
      failureReason: "invalid_credentials",
    });
    throw new AppError("Invalid email or password.", 401);
  }

  const sessionId = crypto.randomUUID();

  const token = jwt.sign(
    {
      sub: String(user.id),
    },
    env.jwtSecret,
    {
      algorithm: "HS256",
      audience: env.jwtAudience,
      expiresIn: "7d",
      issuer: env.jwtIssuer,
      jwtid: sessionId,
    }
  );

  await getDb().transaction(async (trx) => {
    await userRepository.updateLastLogin(user.id, trx);
    await saveSigninTrail(
      {
        userId: user.id,
        email,
        outcome: AUTH_TRAIL_OUTCOMES.SUCCESS,
        sessionId,
      },
      trx
    );
  });

  return {
    message: "Signin successful.",
    token,
    user: mapUser({
      ...user,
      last_login: toUtcDate(),
    }),
  };
};

const signout = async (user, trailContext = {}) => {
  await saveAuthenticationTrail(
    AUTH_TRAIL_EVENT_TYPES.SIGNOUT,
    trailContext,
    {
      userId: user.sub,
      email: user.email,
      outcome: AUTH_TRAIL_OUTCOMES.SUCCESS,
      sessionId: user.sessionId,
    }
  );

  return {
    message: "Signout successful.",
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
  invalidateUserCache(normalizedUserId);

  const updatedUser = await userRepository.findById(normalizedUserId);
  return mapUser(updatedUser);
};

module.exports = {
  getCurrentUser,
  signin,
  signout,
  signup,
  updateCurrentUser,
};
