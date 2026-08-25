const userRepository = require("../repositories/user.repository");

// requireAuth re-reads the user row on every authenticated request to enforce
// is_active/role from the database rather than a stale JWT claim, making this
// the single most frequently executed query in the app even though user rows
// change rarely. A short TTL bounds how long a deactivation or role change
// can take to apply; explicit invalidation from every user-mutating write
// path makes the common case (no admin action in flight) apply instantly.
const CACHE_TTL_MS = 60 * 1000;

const cache = new Map();

const getCachedUserById = async (userId) => {
  const cached = cache.get(userId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  const user = await userRepository.findById(userId);

  if (user) {
    cache.set(userId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
  } else {
    cache.delete(userId);
  }

  return user;
};

const invalidateUserCache = (userId) => {
  cache.delete(Number(userId));
};

module.exports = {
  getCachedUserById,
  invalidateUserCache,
};
