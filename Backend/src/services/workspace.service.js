const { getDb } = require("../config/database");
const workspaceRepository = require("../repositories/workspace.repository");
const workspaceUserRepository = require("../repositories/workspace-user.repository");
const userRepository = require("../repositories/user.repository");
const AppError = require("../utils/app-error");
const { buildTimestampedSlug, slugify } = require("../utils/slug");
const { hashPassword } = require("../utils/password");
const {
  validateCreateWorkspacePayload,
  validateInviteWorkspaceUserPayload,
  validateUpdateWorkspaceUserPayload,
  validateUpdateWorkspaceUserStatusPayload,
  validateUpdateWorkspacePayload,
} = require("../validators/workspace.validator");

const mapWorkspace = (workspace) => ({
  id: workspace.id,
  workspaceName: workspace.workspace_name ?? workspace.workspaceName,
  slug: workspace.slug,
  workspaceDescription:
    workspace.workspace_description ?? workspace.workspaceDescription ?? "",
  createdAt: workspace.created_at ?? workspace.createdAt ?? null,
  updatedAt: workspace.updated_at ?? workspace.updatedAt ?? null,
  membershipRole: workspace.membership_role ?? workspace.membershipRole ?? null,
  membershipStatus: workspace.membership_status ?? workspace.membershipStatus ?? null,
});

const mapWorkspaceUser = (workspaceUser) => ({
  id: workspaceUser.user_id ?? workspaceUser.userId,
  workspaceUserId: workspaceUser.id,
  workspaceId: workspaceUser.workspace_id ?? workspaceUser.workspaceId,
  firstName: workspaceUser.first_name ?? workspaceUser.firstName ?? "",
  lastName: workspaceUser.last_name ?? workspaceUser.lastName ?? "",
  email: workspaceUser.email ?? "",
  phone: workspaceUser.phone ?? "",
  lastLogin: workspaceUser.last_login ?? workspaceUser.lastLogin ?? null,
  isActive: Boolean(workspaceUser.is_active ?? workspaceUser.isActive),
  role: workspaceUser.user_role ?? workspaceUser.userRole ?? "user",
  workspaceRole: workspaceUser.workspace_role ?? workspaceUser.workspaceRole ?? "member",
  workspaceStatus: workspaceUser.workspace_status ?? workspaceUser.workspaceStatus ?? "active",
  joinedAt: workspaceUser.joined_at ?? workspaceUser.joinedAt ?? null,
  createdBy: workspaceUser.created_by ?? workspaceUser.createdBy ?? null,
  updatedAt: workspaceUser.updated_at ?? workspaceUser.updatedAt ?? null,
});

const buildUniqueWorkspaceSlug = async (workspaceName, excludeWorkspaceId = null, trx = getDb()) => {
  const baseSlug = slugify(workspaceName);
  let candidateSlug = baseSlug;
  let timestampSeed = Date.now();

  while (true) {
    const existingWorkspace = await workspaceRepository.findBySlug(candidateSlug, trx);

    if (!existingWorkspace || Number(existingWorkspace.id) === Number(excludeWorkspaceId)) {
      return candidateSlug;
    }

    timestampSeed += 1;
    candidateSlug = buildTimestampedSlug(baseSlug, timestampSeed);
  }
};

const splitInviteeName = (name = "") => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "User";

  return {
    firstName,
    lastName,
  };
};

const generateTemporaryPassword = () =>
  `Brokod@${Math.random().toString(36).slice(-8)}${Date.now().toString().slice(-4)}`;

const createWorkspace = async (payload, userId) => {
  const { workspaceName, workspaceDescription } =
    validateCreateWorkspacePayload(payload);

  const workspace = await getDb().transaction(async (trx) => {
    const slug = await buildUniqueWorkspaceSlug(workspaceName, null, trx);
    const workspaceId = await workspaceRepository.create(
      {
        workspaceName,
        slug,
        workspaceDescription,
        createdBy: userId,
      },
      trx
    );

    await workspaceUserRepository.create(
      {
        workspaceId,
        userId,
        role: "owner",
        status: "active",
        createdBy: userId,
      },
      trx
    );

    return workspaceRepository.findByIdForUser(workspaceId, userId, trx);
  });

  return mapWorkspace(workspace);
};

const getWorkspaces = async (userId) => {
  const workspaces = await workspaceRepository.findAllByUserId(userId);
  return workspaces.map(mapWorkspace);
};

const getWorkspaceUsers = async (workspaceId, filters = {}) => {
  const normalizedWorkspaceId = Number(workspaceId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  const page = Number(filters?.page ?? 1);
  const limit = Number(filters?.limit ?? 10);
  const search = String(filters?.search || "").trim();

  if (!Number.isInteger(page) || page <= 0) {
    throw new AppError("Please provide a valid page number.", 400);
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new AppError("Please provide a valid limit between 1 and 100.", 400);
  }

  const offset = (page - 1) * limit;

  const [users, total] = await Promise.all([
    workspaceUserRepository.findAllByWorkspaceId(normalizedWorkspaceId, {
      search,
      limit,
      offset,
    }),
    workspaceUserRepository.countAllByWorkspaceId(normalizedWorkspaceId, {
      search,
    }),
  ]);

  return {
    users: users.map(mapWorkspaceUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const inviteWorkspaceUser = async (workspaceId, payload, userId) => {
  const normalizedWorkspaceId = Number(workspaceId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  const { name, email, phone, role } = validateInviteWorkspaceUserPayload(payload);
  const { firstName, lastName } = splitInviteeName(name);

  return getDb().transaction(async (trx) => {
    let invitedUser = await userRepository.findByEmail(email);
    let temporaryPassword = null;

    if (!invitedUser) {
      temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await hashPassword(temporaryPassword);
      const invitedUserId = await userRepository.create(
        {
          firstName,
          lastName,
          email,
          phone,
          password: hashedPassword,
        },
        trx
      );

      invitedUser = await userRepository.findById(invitedUserId);
    }

    const existingMembership = await workspaceUserRepository.findByWorkspaceIdAndUserId(
      normalizedWorkspaceId,
      invitedUser.id,
      trx
    );

    if (existingMembership) {
      throw new AppError("This user is already a member of the workspace.", 409);
    }

    await workspaceUserRepository.create(
      {
        workspaceId: normalizedWorkspaceId,
        userId: invitedUser.id,
        role,
        status: "active",
        createdBy: userId,
      },
      trx
    );

    return {
      user: mapWorkspaceUser({
        id: invitedUser.id,
        workspace_id: normalizedWorkspaceId,
        user_id: invitedUser.id,
        first_name: invitedUser.first_name ?? firstName,
        last_name: invitedUser.last_name ?? lastName,
        email: invitedUser.email ?? email,
        phone: invitedUser.phone ?? phone,
        last_login: invitedUser.last_login ?? null,
        is_active: invitedUser.is_active ?? true,
        user_role: invitedUser.role ?? "user",
        workspace_role: role,
        workspace_status: "active",
        joined_at: new Date(),
        created_by: userId,
        updated_at: new Date(),
      }),
      temporaryPassword,
      createdNewUser: Boolean(temporaryPassword),
    };
  });
};

const updateWorkspaceUser = async (workspaceId, workspaceUserId, payload, currentUserId) => {
  const normalizedWorkspaceId = Number(workspaceId);
  const normalizedWorkspaceUserId = Number(workspaceUserId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  if (!Number.isInteger(normalizedWorkspaceUserId) || normalizedWorkspaceUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const targetMembership = await workspaceUserRepository.findByWorkspaceIdAndUserId(
    normalizedWorkspaceId,
    normalizedWorkspaceUserId
  );

  if (!targetMembership) {
    throw new AppError("Workspace user not found.", 404);
  }

  if (
    normalizedWorkspaceUserId === Number(currentUserId) &&
    String(payload?.role || "").trim().toLowerCase() !== "owner"
  ) {
    throw new AppError("You cannot change your own workspace owner role.", 400);
  }

  const { name, email, phone, role } = validateUpdateWorkspaceUserPayload(payload);
  const { firstName, lastName } = splitInviteeName(name);

  const targetUser = await userRepository.findById(normalizedWorkspaceUserId);

  if (!targetUser) {
    throw new AppError("Workspace user not found.", 404);
  }

  const existingUserWithEmail = await userRepository.findByEmail(email);

  if (existingUserWithEmail && Number(existingUserWithEmail.id) !== normalizedWorkspaceUserId) {
    throw new AppError("An account with this email already exists.", 409);
  }

  return getDb().transaction(async (trx) => {
    await userRepository.updateById(
      normalizedWorkspaceUserId,
      {
        firstName,
        lastName,
        email,
        phone,
      },
      trx
    );

    await workspaceUserRepository.updateByWorkspaceIdAndUserId(
      normalizedWorkspaceId,
      normalizedWorkspaceUserId,
      {
        role,
        status: targetMembership.status || "active",
      },
      trx
    );

    const refreshedUsers = await workspaceUserRepository.findAllByWorkspaceId(
      normalizedWorkspaceId,
      {},
      trx
    );

    const refreshedWorkspaceUser = refreshedUsers.find(
      (workspaceUser) => Number(workspaceUser.user_id) === normalizedWorkspaceUserId
    );

    if (!refreshedWorkspaceUser) {
      throw new AppError("Workspace user not found.", 404);
    }

    return mapWorkspaceUser(refreshedWorkspaceUser);
  });
};

const deleteWorkspaceUser = async (workspaceId, workspaceUserId, currentUserId) => {
  const normalizedWorkspaceId = Number(workspaceId);
  const normalizedWorkspaceUserId = Number(workspaceUserId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  if (!Number.isInteger(normalizedWorkspaceUserId) || normalizedWorkspaceUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const targetMembership = await workspaceUserRepository.findByWorkspaceIdAndUserId(
    normalizedWorkspaceId,
    normalizedWorkspaceUserId
  );

  if (!targetMembership) {
    throw new AppError("Workspace user not found.", 404);
  }

  if (normalizedWorkspaceUserId === Number(currentUserId)) {
    throw new AppError("You cannot remove yourself from the workspace.", 400);
  }

  if (String(targetMembership.role || "").toLowerCase() === "owner") {
    throw new AppError("Workspace owner cannot be removed.", 400);
  }

  await workspaceUserRepository.deleteByWorkspaceIdAndUserId(
    normalizedWorkspaceId,
    normalizedWorkspaceUserId
  );
};

const updateWorkspaceUserStatus = async (workspaceId, workspaceUserId, payload, currentUserId) => {
  const normalizedWorkspaceId = Number(workspaceId);
  const normalizedWorkspaceUserId = Number(workspaceUserId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  if (!Number.isInteger(normalizedWorkspaceUserId) || normalizedWorkspaceUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const targetMembership = await workspaceUserRepository.findByWorkspaceIdAndUserId(
    normalizedWorkspaceId,
    normalizedWorkspaceUserId
  );

  if (!targetMembership) {
    throw new AppError("Workspace user not found.", 404);
  }

  const { status } = validateUpdateWorkspaceUserStatusPayload(payload);

  if (normalizedWorkspaceUserId === Number(currentUserId) && status !== "active") {
    throw new AppError("You cannot deactivate your own workspace membership.", 400);
  }

  await workspaceUserRepository.updateByWorkspaceIdAndUserId(
    normalizedWorkspaceId,
    normalizedWorkspaceUserId,
    {
      role: targetMembership.role,
      status,
    }
  );

  const refreshedUsers = await workspaceUserRepository.findAllByWorkspaceId(normalizedWorkspaceId);
  const refreshedWorkspaceUser = refreshedUsers.find(
    (workspaceUser) => Number(workspaceUser.user_id) === normalizedWorkspaceUserId
  );

  if (!refreshedWorkspaceUser) {
    throw new AppError("Workspace user not found.", 404);
  }

  return mapWorkspaceUser(refreshedWorkspaceUser);
};

const updateWorkspace = async (workspaceId, payload, userId) => {
  const normalizedWorkspaceId = Number(workspaceId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  const existingWorkspace = await workspaceRepository.findById(normalizedWorkspaceId);

  if (!existingWorkspace) {
    throw new AppError("Workspace not found.", 404);
  }

  const updates = validateUpdateWorkspacePayload(payload);

  const nextSlug =
    updates.workspaceName ===
    (existingWorkspace.workspace_name ?? existingWorkspace.workspaceName)
      ? existingWorkspace.slug
      : await buildUniqueWorkspaceSlug(
          updates.workspaceName,
          normalizedWorkspaceId
        );

  await workspaceRepository.updateById(normalizedWorkspaceId, {
    ...updates,
    slug: nextSlug,
  });

  const updatedWorkspace = await workspaceRepository.findById(normalizedWorkspaceId);

  return mapWorkspace(updatedWorkspace);
};

const deleteWorkspace = async (workspaceId, userId) => {
  const normalizedWorkspaceId = Number(workspaceId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  const existingWorkspace = await workspaceRepository.findById(normalizedWorkspaceId);

  if (!existingWorkspace) {
    throw new AppError("Workspace not found.", 404);
  }

  await workspaceRepository.softDeleteById(normalizedWorkspaceId, userId);
};

module.exports = {
  createWorkspace,
  deleteWorkspace,
  deleteWorkspaceUser,
  getWorkspaceUsers,
  getWorkspaces,
  inviteWorkspaceUser,
  updateWorkspaceUser,
  updateWorkspaceUserStatus,
  updateWorkspace,
};
