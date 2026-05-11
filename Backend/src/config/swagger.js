const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const env = require("./env");

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Brokod PPCRMM Backend API",
      version: "1.0.0",
      description: "API documentation for the backend authentication endpoints.",
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              example: 1,
            },
            firstName: {
              type: "string",
              example: "Ankit",
            },
            lastName: {
              type: "string",
              example: "Sharma",
            },
            email: {
              type: "string",
              format: "email",
              example: "ankit@example.com",
            },
            phone: {
              type: "string",
              example: "9876543210",
            },
            role: {
              type: "string",
              example: "user",
            },
            isActive: {
              type: "boolean",
              example: true,
            },
            lastLogin: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2026-04-13T12:30:00.000Z",
            },
          },
        },
        SignupRequest: {
          type: "object",
          required: ["firstName", "lastName", "email", "phone", "password"],
          properties: {
            firstName: {
              type: "string",
              example: "Ankit",
            },
            lastName: {
              type: "string",
              example: "Sharma",
            },
            email: {
              type: "string",
              format: "email",
              example: "ankit@example.com",
            },
            phone: {
              type: "string",
              example: "9876543210",
            },
            password: {
              type: "string",
              format: "password",
              minLength: 8,
              example: "secret123",
            },
          },
        },
        SigninRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "ankit@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "secret123",
            },
          },
        },
        SignupResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Signup successful.",
            },
            user: {
              $ref: "#/components/schemas/User",
            },
          },
        },
        SigninResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Signin successful.",
            },
            token: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.token",
            },
            user: {
              $ref: "#/components/schemas/User",
            },
          },
        },
        CurrentUserResponse: {
          type: "object",
          properties: {
            user: {
              $ref: "#/components/schemas/User",
            },
          },
        },
        Project: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              example: 1,
            },
            workspaceId: {
              type: "integer",
              example: 2,
            },
            workspaceSlug: {
              type: "string",
              example: "my-workspace",
            },
            projectName: {
              type: "string",
              example: "CRM Revamp",
            },
            slug: {
              type: "string",
              example: "crm-revamp",
            },
            projectOwner: {
              type: "integer",
              example: 4,
            },
            description: {
              type: "string",
              example: "A rebuild of the CRM experience for the sales team.",
            },
            status: {
              type: "string",
              example: "in_progress",
            },
            access: {
              type: "string",
              example: "private",
            },
            startDate: {
              type: "string",
              format: "date",
              example: "2026-04-13",
            },
            endDate: {
              type: "string",
              format: "date",
              example: "2026-05-15",
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["crm", "sales", "priority"],
            },
            createdAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdBy: {
              type: "integer",
              example: 4,
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            membershipRole: {
              type: "string",
              nullable: true,
              example: "owner",
            },
            membershipStatus: {
              type: "string",
              nullable: true,
              example: "active",
            },
          },
        },
        ProjectUser: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              example: 1,
            },
            projectId: {
              type: "integer",
              example: 12,
            },
            userId: {
              type: "integer",
              example: 4,
            },
            role: {
              type: "string",
              example: "owner",
            },
            status: {
              type: "string",
              example: "active",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdBy: {
              type: "integer",
              example: 4,
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            user: {
              type: "object",
              properties: {
                id: {
                  type: "integer",
                  example: 4,
                },
                firstName: {
                  type: "string",
                  example: "Ankit",
                },
                lastName: {
                  type: "string",
                  example: "Sharma",
                },
                email: {
                  type: "string",
                  format: "email",
                  example: "ankit@example.com",
                },
                phone: {
                  type: "string",
                  example: "9876543210",
                },
                isActive: {
                  type: "boolean",
                  example: true,
                },
              },
            },
          },
        },
        CreateProjectRequest: {
          type: "object",
          required: ["workspaceId", "projectName", "description", "status", "startDate", "endDate"],
          properties: {
            workspaceId: {
              type: "integer",
              example: 2,
            },
            projectName: {
              type: "string",
              example: "CRM Revamp",
            },
            description: {
              type: "string",
              example: "A rebuild of the CRM experience for the sales team.",
            },
            status: {
              type: "string",
              example: "in_progress",
            },
            access: {
              type: "string",
              example: "private",
            },
            startDate: {
              type: "string",
              format: "date",
              example: "2026-04-13",
            },
            endDate: {
              type: "string",
              format: "date",
              example: "2026-05-15",
            },
            tags: {
              oneOf: [
                {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                {
                  type: "string",
                },
              ],
              example: ["crm", "sales", "priority"],
            },
          },
        },
        UpdateProjectRequest: {
          type: "object",
          properties: {
            workspaceId: {
              type: "integer",
              example: 3,
            },
            projectName: {
              type: "string",
              example: "CRM Revamp Phase 2",
            },
            description: {
              type: "string",
              example: "Updated scope for the CRM initiative.",
            },
            status: {
              type: "string",
              example: "on_hold",
            },
            access: {
              type: "string",
              example: "public",
            },
            startDate: {
              type: "string",
              format: "date",
              example: "2026-04-13",
            },
            endDate: {
              type: "string",
              format: "date",
              example: "2026-06-01",
            },
            tags: {
              oneOf: [
                {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                {
                  type: "string",
                },
              ],
              example: ["crm", "phase-2"],
            },
          },
        },
        CreateProjectResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Project created successfully.",
            },
            project: {
              $ref: "#/components/schemas/Project",
            },
          },
        },
        UpdateProjectResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Project updated successfully.",
            },
            project: {
              $ref: "#/components/schemas/Project",
            },
          },
        },
        DeleteProjectResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Project deleted successfully.",
            },
          },
        },
        GetProjectResponse: {
          type: "object",
          properties: {
            project: {
              $ref: "#/components/schemas/Project",
            },
          },
        },
        FetchProjectsResponse: {
          type: "object",
          properties: {
            projects: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Project",
              },
            },
            pagination: {
              type: "object",
              properties: {
                page: {
                  type: "integer",
                  example: 1,
                },
                limit: {
                  type: "integer",
                  example: 10,
                },
                total: {
                  type: "integer",
                  example: 42,
                },
                totalPages: {
                  type: "integer",
                  example: 5,
                },
              },
            },
          },
        },
        FetchProjectUsersResponse: {
          type: "object",
          properties: {
            project: {
              $ref: "#/components/schemas/Project",
            },
            users: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ProjectUser",
              },
            },
          },
        },
        Task: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              example: 1,
            },
            projectId: {
              type: "integer",
              example: 12,
            },
            workspaceId: {
              type: "integer",
              example: 3,
            },
            title: {
              type: "string",
              example: "Plan CRM backlog",
            },
            slug: {
              type: "string",
              example: "plan-crm-backlog",
            },
            description: {
              type: "string",
              example: "Organize the initial project backlog and ownership.",
            },
            status: {
              type: "string",
              example: "todo",
            },
            priority: {
              type: "string",
              example: "high",
            },
            assignedBy: {
              type: "integer",
              nullable: true,
              example: 4,
            },
            assignedTo: {
              type: "integer",
              nullable: true,
              example: 7,
            },
            createdBy: {
              type: "integer",
              example: 4,
            },
            startDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-03",
            },
            dueDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-10",
            },
            completedAt: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-12",
            },
            taskType: {
              type: "string",
              example: "feature",
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["planning", "backlog"],
            },
            assignedByName: {
              type: "string",
              nullable: true,
              example: "Ankit Sharma",
            },
            assignedToName: {
              type: "string",
              nullable: true,
              example: "Priya Singh",
            },
            createdByName: {
              type: "string",
              nullable: true,
              example: "Ankit Sharma",
            },
            commentsCount: {
              type: "integer",
              example: 4,
            },
            activityLogsCount: {
              type: "integer",
              example: 7,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
          },
        },
        CreateTaskRequest: {
          type: "object",
          required: ["projectId", "workspaceId", "title"],
          properties: {
            projectId: {
              type: "integer",
              example: 12,
            },
            workspaceId: {
              type: "integer",
              example: 3,
            },
            title: {
              type: "string",
              example: "Plan CRM backlog",
            },
            description: {
              type: "string",
              example: "Organize the initial project backlog and ownership.",
            },
            status: {
              type: "string",
              example: "todo",
            },
            priority: {
              type: "string",
              example: "high",
            },
            assignedBy: {
              type: "integer",
              example: 4,
            },
            assignedTo: {
              type: "integer",
              example: 7,
            },
            startDate: {
              type: "string",
              format: "date",
              example: "2026-05-03",
            },
            dueDate: {
              type: "string",
              format: "date",
              example: "2026-05-10",
            },
            completedAt: {
              type: "string",
              format: "date",
              example: "2026-05-12",
            },
            taskType: {
              type: "string",
              example: "feature",
            },
            tags: {
              oneOf: [
                {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                {
                  type: "string",
                },
              ],
              example: ["planning", "backlog"],
            },
            initialComment: {
              type: "string",
              example: "Initial planning notes added.",
            },
            initialActivityLog: {
              type: "string",
              example: "Task created and assigned for planning.",
            },
          },
        },
        UpdateTaskRequest: {
          type: "object",
          required: ["title", "status", "priority", "taskType"],
          properties: {
            title: {
              type: "string",
              example: "Plan CRM backlog",
            },
            description: {
              type: "string",
              example: "Organize the initial project backlog and ownership.",
            },
            status: {
              type: "string",
              example: "todo",
            },
            priority: {
              type: "string",
              example: "high",
            },
            assignedBy: {
              type: "integer",
              nullable: true,
              example: 4,
            },
            assignedTo: {
              type: "integer",
              nullable: true,
              example: 7,
            },
            startDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-03",
            },
            dueDate: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-10",
            },
            completedAt: {
              type: "string",
              format: "date",
              nullable: true,
              example: "2026-05-12",
            },
            taskType: {
              type: "string",
              example: "feature",
            },
            tags: {
              oneOf: [
                {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                {
                  type: "string",
                },
              ],
              example: ["planning", "backlog"],
            },
          },
        },
        CreateTaskResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Task created successfully.",
            },
            task: {
              $ref: "#/components/schemas/Task",
            },
          },
        },
        UpdateTaskResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Task updated successfully.",
            },
            task: {
              $ref: "#/components/schemas/Task",
            },
          },
        },
        GetTaskResponse: {
          type: "object",
          properties: {
            task: {
              $ref: "#/components/schemas/Task",
            },
          },
        },
        FetchTasksResponse: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Task",
              },
            },
            pagination: {
              type: "object",
              properties: {
                page: {
                  type: "integer",
                  example: 1,
                },
                limit: {
                  type: "integer",
                  example: 10,
                },
                total: {
                  type: "integer",
                  example: 42,
                },
                totalPages: {
                  type: "integer",
                  example: 5,
                },
              },
            },
          },
        },
        DeleteTaskResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Task deleted successfully.",
            },
          },
        },
        Workspace: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              example: 2,
            },
            slug: {
              type: "string",
              example: "my-workspace",
            },
            workspaceName: {
              type: "string",
              example: "My Workspace",
            },
            workspaceDescription: {
              type: "string",
              example: "Workspace for product planning and delivery.",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            membershipRole: {
              type: "string",
              nullable: true,
              example: "owner",
            },
            membershipStatus: {
              type: "string",
              nullable: true,
              example: "active",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Please provide a valid email address.",
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, "../routes/*.js")],
});

module.exports = {
  swaggerSpec,
  swaggerUi,
};
