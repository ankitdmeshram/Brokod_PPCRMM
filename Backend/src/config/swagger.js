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
            projectName: {
              type: "string",
              example: "CRM Revamp",
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
        Workspace: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              example: 2,
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
