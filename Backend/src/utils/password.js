const crypto = require("crypto");

const hashPassword = (password) =>
  new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");

    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });

const verifyPassword = (password, hashedPassword) =>
  new Promise((resolve, reject) => {
    const [salt, storedHash] = typeof hashedPassword === "string" ? hashedPassword.split(":") : [];

    if (!salt || !storedHash) {
      resolve(false);
      return;
    }

    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      const storedHashBuffer = Buffer.from(storedHash, "hex");

      if (storedHashBuffer.length !== derivedKey.length) {
        resolve(false);
        return;
      }

      resolve(crypto.timingSafeEqual(storedHashBuffer, derivedKey));
    });
  });

module.exports = {
  hashPassword,
  verifyPassword,
};
