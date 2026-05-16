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

const formatDateOnly = (date = new Date()) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (dateString, days) => {
  const [year, month, day] = String(dateString || "")
    .split("-")
    .map((part) => Number(part));
  const nextDate = new Date(year, month - 1, day);
  nextDate.setDate(nextDate.getDate() + days);
  return formatDateOnly(nextDate);
};

const buildFullName = (firstName = "", lastName = "") =>
  `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();

const stripHtmlTags = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncateText = (value, maxLength = 180) => {
  const normalizedValue = String(value || "").trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const mapWorkspaceNotification = (notification) => ({
  id: notification.id,
  type: notification.type,
  category: notification.category,
  severity: notification.severity,
  title: notification.title,
  message: notification.message,
  workspaceId: notification.workspaceId,
  projectId: notification.projectId,
  projectName: notification.projectName,
  projectSlug: notification.projectSlug,
  taskId: notification.taskId ?? null,
  taskTitle: notification.taskTitle ?? null,
  taskSlug: notification.taskSlug ?? null,
  dueDate: notification.dueDate ?? null,
  createdAt: notification.createdAt,
});

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

const getWorkspaceNotifications = async (workspaceId, userId, filters = {}) => {
  const normalizedWorkspaceId = Number(workspaceId);
  const normalizedUserId = Number(userId);
  const normalizedProjectName = String(filters?.projectName || "").trim();

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const today = formatDateOnly();
  const taskDueSoonDate = addDays(today, 2);
  const projectDueSoonDate = addDays(today, 7);

  const [
    assignedTasks,
    taskComments,
    projectMemberships,
    publicProjects,
    taskDeadlines,
    projectDeadlines,
  ] = await Promise.all([
    getDb()("tasks")
      .join("projects", "projects.id", "tasks.project_id")
      .leftJoin({ actor: "users" }, "actor.id", "tasks.assigned_by")
      .leftJoin({ project_membership: "project_users" }, function joinMembership() {
        this.on("project_membership.project_id", "=", "projects.id")
          .andOn("project_membership.user_id", "=", getDb().raw("?", [normalizedUserId]))
          .andOn("project_membership.status", "=", getDb().raw("?", ["active"]));
      })
      .select(
        "tasks.id as task_id",
        "tasks.title as task_title",
        "tasks.slug as task_slug",
        "tasks.due_date",
        "tasks.created_at",
        "tasks.updated_at",
        "projects.id as project_id",
        "projects.project_name",
        "projects.slug as project_slug",
        "actor.first_name as actor_first_name",
        "actor.last_name as actor_last_name"
      )
      .where("tasks.workspace_id", normalizedWorkspaceId)
      .andWhere("tasks.assigned_to", normalizedUserId)
      .whereNotNull("tasks.assigned_by")
      .andWhere("tasks.assigned_by", "!=", normalizedUserId)
      .modify((query) => {
        if (normalizedProjectName) {
          query.andWhere("projects.project_name", normalizedProjectName);
        }
      })
      .andWhere((builder) => {
        builder.where("projects.access", "public").orWhereNotNull("project_membership.user_id");
      })
      .whereNull("tasks.deleted_at")
      .whereNull("projects.deleted_at")
      .orderBy("tasks.updated_at", "desc"),
    getDb()("task_comments")
      .join("tasks", "tasks.id", "task_comments.task_id")
      .join("projects", "projects.id", "tasks.project_id")
      .leftJoin({ actor: "users" }, "actor.id", "task_comments.created_by")
      .leftJoin({ project_membership: "project_users" }, function joinMembership() {
        this.on("project_membership.project_id", "=", "projects.id")
          .andOn("project_membership.user_id", "=", getDb().raw("?", [normalizedUserId]))
          .andOn("project_membership.status", "=", getDb().raw("?", ["active"]));
      })
      .select(
        "task_comments.id as comment_id",
        "task_comments.comment as comment_text",
        "task_comments.created_at as comment_created_at",
        "task_comments.updated_at as comment_updated_at",
        "tasks.id as task_id",
        "tasks.title as task_title",
        "tasks.slug as task_slug",
        "tasks.assigned_by",
        "tasks.assigned_to",
        "tasks.created_by",
        "projects.id as project_id",
        "projects.project_name",
        "projects.slug as project_slug",
        "actor.first_name as actor_first_name",
        "actor.last_name as actor_last_name"
      )
      .where("tasks.workspace_id", normalizedWorkspaceId)
      .andWhere("task_comments.created_by", "!=", normalizedUserId)
      .andWhere((builder) => {
        builder
          .where("tasks.assigned_by", normalizedUserId)
          .orWhere("tasks.assigned_to", normalizedUserId)
          .orWhere("tasks.created_by", normalizedUserId);
      })
      .modify((query) => {
        if (normalizedProjectName) {
          query.andWhere("projects.project_name", normalizedProjectName);
        }
      })
      .andWhere((builder) => {
        builder.where("projects.access", "public").orWhereNotNull("project_membership.user_id");
      })
      .whereNull("tasks.deleted_at")
      .whereNull("projects.deleted_at")
      .orderBy("task_comments.updated_at", "desc"),
    getDb()("project_users")
      .join("projects", "projects.id", "project_users.project_id")
      .leftJoin({ actor: "users" }, "actor.id", "project_users.created_by")
      .select(
        "project_users.user_id",
        "project_users.role",
        "project_users.created_at",
        "projects.id as project_id",
        "projects.project_name",
        "projects.slug as project_slug",
        "actor.first_name as actor_first_name",
        "actor.last_name as actor_last_name"
      )
      .where("projects.workspace_id", normalizedWorkspaceId)
      .andWhere("project_users.user_id", normalizedUserId)
      .andWhere("project_users.status", "active")
      .andWhere("project_users.role", "!=", "owner")
      .andWhere("project_users.created_by", "!=", normalizedUserId)
      .modify((query) => {
        if (normalizedProjectName) {
          query.andWhere("projects.project_name", normalizedProjectName);
        }
      })
      .whereNull("projects.deleted_at")
      .orderBy("project_users.created_at", "desc"),
    getDb()("projects")
      .leftJoin({ actor: "users" }, "actor.id", "projects.created_by")
      .select(
        "projects.id as project_id",
        "projects.project_name",
        "projects.slug as project_slug",
        "projects.created_at",
        "actor.first_name as actor_first_name",
        "actor.last_name as actor_last_name"
      )
      .where("projects.workspace_id", normalizedWorkspaceId)
      .andWhere("projects.access", "public")
      .andWhere("projects.created_by", "!=", normalizedUserId)
      .modify((query) => {
        if (normalizedProjectName) {
          query.andWhere("projects.project_name", normalizedProjectName);
        }
      })
      .whereNull("projects.deleted_at")
      .orderBy("projects.created_at", "desc"),
    getDb()("tasks")
      .join("projects", "projects.id", "tasks.project_id")
      .leftJoin({ project_membership: "project_users" }, function joinMembership() {
        this.on("project_membership.project_id", "=", "projects.id")
          .andOn("project_membership.user_id", "=", getDb().raw("?", [normalizedUserId]))
          .andOn("project_membership.status", "=", getDb().raw("?", ["active"]));
      })
      .select(
        "tasks.id as task_id",
        "tasks.title as task_title",
        "tasks.slug as task_slug",
        "tasks.due_date",
        "tasks.status",
        "projects.id as project_id",
        "projects.project_name",
        "projects.slug as project_slug"
      )
      .where("tasks.workspace_id", normalizedWorkspaceId)
      .whereNotNull("tasks.due_date")
      .andWhere("tasks.status", "!=", "done")
      .andWhereRaw("DATE(tasks.due_date) <= DATE(?)", [taskDueSoonDate])
      .modify((query) => {
        if (normalizedProjectName) {
          query.andWhere("projects.project_name", normalizedProjectName);
        }
      })
      .andWhere((builder) => {
        builder.where("projects.access", "public").orWhereNotNull("project_membership.user_id");
      })
      .whereNull("tasks.deleted_at")
      .whereNull("projects.deleted_at")
      .orderBy("tasks.due_date", "asc"),
    getDb()("projects")
      .leftJoin({ project_membership: "project_users" }, function joinMembership() {
        this.on("project_membership.project_id", "=", "projects.id")
          .andOn("project_membership.user_id", "=", getDb().raw("?", [normalizedUserId]))
          .andOn("project_membership.status", "=", getDb().raw("?", ["active"]));
      })
      .select(
        "projects.id as project_id",
        "projects.project_name",
        "projects.slug as project_slug",
        "projects.end_date",
        "projects.status"
      )
      .where("projects.workspace_id", normalizedWorkspaceId)
      .whereNotNull("projects.end_date")
      .whereNotIn("projects.status", ["completed", "cancelled"])
      .andWhereRaw("DATE(projects.end_date) <= DATE(?)", [projectDueSoonDate])
      .modify((query) => {
        if (normalizedProjectName) {
          query.andWhere("projects.project_name", normalizedProjectName);
        }
      })
      .andWhere((builder) => {
        builder.where("projects.access", "public").orWhereNotNull("project_membership.user_id");
      })
      .whereNull("projects.deleted_at")
      .orderBy("projects.end_date", "asc"),
  ]);

  const notifications = [
    ...assignedTasks.map((task) => {
      const actorName = buildFullName(task.actor_first_name, task.actor_last_name) || "Someone";

      return mapWorkspaceNotification({
        id: `task-assignment-${task.task_id}`,
        type: "task_assignment",
        category: "assignments",
        severity: "info",
        title: "Task assigned to you",
        message: `${actorName} assigned "${task.task_title}" to you in ${task.project_name}.`,
        workspaceId: normalizedWorkspaceId,
        projectId: task.project_id,
        projectName: task.project_name,
        projectSlug: task.project_slug,
        taskId: task.task_id,
        taskTitle: task.task_title,
        taskSlug: task.task_slug,
        dueDate: task.due_date,
        createdAt: task.updated_at ?? task.created_at,
      });
    }),
    ...taskComments.map((comment) => {
      const actorName = buildFullName(comment.actor_first_name, comment.actor_last_name) || "Someone";
      const commentPreview = truncateText(stripHtmlTags(comment.comment_text), 180);

      return mapWorkspaceNotification({
        id: `task-comment-${comment.comment_id}-${normalizedUserId}`,
        type: "task_comment",
        category: "assignments",
        severity: "info",
        title: "New comment on task",
        message: commentPreview
          ? `${actorName} commented on "${comment.task_title}" in ${comment.project_name}: "${commentPreview}"`
          : `${actorName} commented on "${comment.task_title}" in ${comment.project_name}.`,
        workspaceId: normalizedWorkspaceId,
        projectId: comment.project_id,
        projectName: comment.project_name,
        projectSlug: comment.project_slug,
        taskId: comment.task_id,
        taskTitle: comment.task_title,
        taskSlug: comment.task_slug,
        createdAt: comment.comment_updated_at ?? comment.comment_created_at,
      });
    }),
    ...projectMemberships.map((membership) => {
      const actorName =
        buildFullName(membership.actor_first_name, membership.actor_last_name) || "Someone";

      return mapWorkspaceNotification({
        id: `project-membership-${membership.project_id}-${membership.created_at}`,
        type: "project_added",
        category: "projects",
        severity: "success",
        title: "Added to a project",
        message: `${actorName} added you to ${membership.project_name} as ${membership.role}.`,
        workspaceId: normalizedWorkspaceId,
        projectId: membership.project_id,
        projectName: membership.project_name,
        projectSlug: membership.project_slug,
        createdAt: membership.created_at,
      });
    }),
    ...publicProjects.map((project) => {
      const actorName = buildFullName(project.actor_first_name, project.actor_last_name) || "Someone";

      return mapWorkspaceNotification({
        id: `public-project-${project.project_id}`,
        type: "public_project_created",
        category: "projects",
        severity: "info",
        title: "New public project",
        message: `${actorName} created a new public project: ${project.project_name}.`,
        workspaceId: normalizedWorkspaceId,
        projectId: project.project_id,
        projectName: project.project_name,
        projectSlug: project.project_slug,
        createdAt: project.created_at,
      });
    }),
    ...taskDeadlines.map((task) => {
      const isOverdue = String(task.due_date || "") < today;

      return mapWorkspaceNotification({
        id: `task-deadline-${task.task_id}`,
        type: isOverdue ? "task_overdue" : "task_due_soon",
        category: "deadlines",
        severity: isOverdue ? "danger" : "warning",
        title: isOverdue ? "Task overdue" : "Task due soon",
        message: isOverdue
          ? `"${task.task_title}" in ${task.project_name} missed its due date.`
          : `"${task.task_title}" in ${task.project_name} is due within 2 days.`,
        workspaceId: normalizedWorkspaceId,
        projectId: task.project_id,
        projectName: task.project_name,
        projectSlug: task.project_slug,
        taskId: task.task_id,
        taskTitle: task.task_title,
        taskSlug: task.task_slug,
        dueDate: task.due_date,
        createdAt: task.due_date,
      });
    }),
    ...projectDeadlines.map((project) => {
      const isOverdue = String(project.end_date || "") < today;

      return mapWorkspaceNotification({
        id: `project-deadline-${project.project_id}`,
        type: isOverdue ? "project_overdue" : "project_due_soon",
        category: "deadlines",
        severity: isOverdue ? "danger" : "warning",
        title: isOverdue ? "Project overdue" : "Project due soon",
        message: isOverdue
          ? `${project.project_name} missed its target end date.`
          : `${project.project_name} is due within 7 days.`,
        workspaceId: normalizedWorkspaceId,
        projectId: project.project_id,
        projectName: project.project_name,
        projectSlug: project.project_slug,
        dueDate: project.end_date,
        createdAt: project.end_date,
      });
    }),
  ]
    .sort((leftNotification, rightNotification) =>
      new Date(rightNotification.createdAt).getTime() -
      new Date(leftNotification.createdAt).getTime()
    );

  return notifications;
};

const inviteWorkspaceUser = async (workspaceId, payload, userId) => {
  const normalizedWorkspaceId = Number(workspaceId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  const { name, email, phone, role } = validateInviteWorkspaceUserPayload(payload);
  const { firstName, lastName } = splitInviteeName(name);

  return getDb().transaction(async (trx) => {
    let invitedUser = await userRepository.findByEmail(email, trx);
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

      invitedUser = await userRepository.findById(invitedUserId, trx);
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

  const { role } = validateUpdateWorkspaceUserPayload(payload);

  return getDb().transaction(async (trx) => {
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
  const normalizedUserId = Number(userId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const existingWorkspace = await workspaceRepository.findById(normalizedWorkspaceId);

  if (!existingWorkspace) {
    throw new AppError("Workspace not found.", 404);
  }

  const membership = await workspaceUserRepository.findByWorkspaceIdAndUserId(
    normalizedWorkspaceId,
    normalizedUserId
  );

  if (!membership || String(membership.status || "").trim().toLowerCase() !== "active") {
    throw new AppError("Workspace not found.", 404);
  }

  const membershipRole = String(membership.role || "").trim().toLowerCase();

  if (membershipRole !== "owner" && membershipRole !== "admin") {
    throw new AppError("Only the workspace owner or admin can update this workspace.", 403);
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

  const updatedWorkspace = await workspaceRepository.findByIdForUser(
    normalizedWorkspaceId,
    normalizedUserId
  );

  return mapWorkspace(updatedWorkspace);
};

const deleteWorkspace = async (workspaceId, userId) => {
  const normalizedWorkspaceId = Number(workspaceId);
  const normalizedUserId = Number(userId);

  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) {
    throw new AppError("Please provide a valid workspace id.", 400);
  }

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new AppError("Please provide a valid user id.", 400);
  }

  const existingWorkspace = await workspaceRepository.findById(normalizedWorkspaceId);

  if (!existingWorkspace) {
    throw new AppError("Workspace not found.", 404);
  }

  const membership = await workspaceUserRepository.findByWorkspaceIdAndUserId(
    normalizedWorkspaceId,
    normalizedUserId
  );

  if (!membership || String(membership.status || "").trim().toLowerCase() !== "active") {
    throw new AppError("Workspace not found.", 404);
  }

  if (String(membership.role || "").trim().toLowerCase() !== "owner") {
    throw new AppError("Only the workspace owner can delete this workspace.", 403);
  }

  await workspaceRepository.softDeleteById(normalizedWorkspaceId, userId);
};

module.exports = {
  createWorkspace,
  deleteWorkspace,
  deleteWorkspaceUser,
  getWorkspaceNotifications,
  getWorkspaceUsers,
  getWorkspaces,
  inviteWorkspaceUser,
  updateWorkspaceUser,
  updateWorkspaceUserStatus,
  updateWorkspace,
};
