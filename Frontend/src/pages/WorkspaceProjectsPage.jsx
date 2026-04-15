import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import ProjectsMain from "../components/workspace/ProjectsMain";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import { useAuthContext } from "../context/AuthContext";
import { fetchWorkspaces } from "../services/workspace.service";
import { showErrorAlert } from "../services/alert.service";

const formatWorkspaceTitle = (workspaceName = "") =>
  workspaceName
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function WorkspaceProjectsPage() {
  const { authSession } = useAuthContext();
  const location = useLocation();
  const { workspaceName = "" } = useParams();
  const [workspace, setWorkspace] = useState(() => location.state?.workspace || null);
  const currentYear = new Date().getFullYear();
  const firstName = authSession?.user?.firstName || "Ankit";
  const lastName = authSession?.user?.lastName || "Meshram";
  const userRole = authSession?.user?.role || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = firstName.charAt(0).toUpperCase() || "A";
  const workspaceTitle = useMemo(
    () => formatWorkspaceTitle(workspaceName) || "Workspace",
    [workspaceName]
  );

  useEffect(() => {
    const resolveWorkspace = async () => {
      if (location.state?.workspace) {
        setWorkspace(location.state.workspace);
        return;
      }

      if (!authSession?.token) {
        return;
      }

      try {
        const result = await fetchWorkspaces(authSession.token);
        const workspaces = Array.isArray(result?.workspaces) ? result.workspaces : [];
        const matchedWorkspace = workspaces.find((item) => {
          const slug = String(item.workspaceName || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

          return slug === workspaceName;
        });

        setWorkspace(matchedWorkspace || null);
      } catch (error) {
        await showErrorAlert(
          "Unable to load workspace",
          error.message || "Something went wrong while loading the workspace."
        );
      }
    };

    resolveWorkspace();
  }, [authSession?.token, location.state, workspaceName]);

  return (
    <AppLayout
      sidebar={<ProjectsSidebar workspaceName={workspaceName} />}
      title="Project Management"
      fullName={fullName}
      initial={initial}
      userRole={userRole}
      currentYear={currentYear}
    >
      <ProjectsMain workspace={workspace} workspaceTitle={workspaceTitle} />
    </AppLayout>
  );
}
