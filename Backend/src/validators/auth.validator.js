const AppError = require("../utils/app-error");
const moment = require("moment-timezone");

const validateSignupPayload = (payload) => {
  const firstName = payload?.firstName?.trim();
  const lastName = payload?.lastName?.trim();
  const email = payload?.email?.trim().toLowerCase();
  const phone = payload?.phone?.trim();
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!firstName || !lastName || !email || !phone || !password) {
    throw new AppError(
      "firstName, lastName, email, phone, and password are required.",
      400
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Please provide a valid email address.", 400);
  }

  if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
    throw new AppError("Please provide a valid phone number.", 400);
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters long.", 400);
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    password,
  };
};

const validateSigninPayload = (payload) => {
  const email = payload?.email?.trim().toLowerCase();
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!email || !password) {
    throw new AppError("email and password are required.", 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Please provide a valid email address.", 400);
  }

  return {
    email,
    password,
  };
};

const validateUpdateProfilePayload = (payload) => {
  const firstName = String(payload?.firstName || "").trim();
  const lastName = String(payload?.lastName || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const phone = String(payload?.phone || "").trim();
  const timeZone = String(payload?.timeZone || "").trim() || "UTC";

  if (!firstName || !lastName || !email || !phone) {
    throw new AppError(
      "firstName, lastName, email, and phone are required.",
      400
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Please provide a valid email address.", 400);
  }

  if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
    throw new AppError("Please provide a valid phone number.", 400);
  }

  if (!moment.tz.zone(timeZone)) {
    throw new AppError("Please provide a valid time zone.", 400);
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    timeZone,
  };
};

module.exports = {
  validateSigninPayload,
  validateSignupPayload,
  validateUpdateProfilePayload,
};
