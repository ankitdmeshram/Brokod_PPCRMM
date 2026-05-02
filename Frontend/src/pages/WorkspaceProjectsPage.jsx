import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/app/AppLayout";
import ProjectsMain from "../components/workspace/ProjectsMain";
import ProjectsSidebar from "../components/workspace/ProjectsSidebar";
import { useAuthContext } from "../context/AuthContext";
import { APP_ROUTES } from "../router/authRoutes";
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
  const navigate = useNavigate();
  const { workspaceSlug = "" } = useParams();
  const [workspace, setWorkspace] = useState(() => location.state?.workspace || null);
  const [isResolvingWorkspace, setIsResolvingWorkspace] = useState(!location.state?.workspace);
  const currentYear = new Date().getFullYear();
  const firstName = authSession?.user?.firstName || "Ankit";
  const lastName = authSession?.user?.lastName || "Meshram";
  const userRole = authSession?.user?.role || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = firstName.charAt(0).toUpperCase() || "A";
  const workspaceTitle = useMemo(
    () => workspace?.workspaceName || formatWorkspaceTitle(workspaceSlug) || "Workspace",
    [workspace?.workspaceName, workspaceSlug]
  );

  useEffect(() => {
    const resolveWorkspace = async () => {
      if (location.state?.workspace) {
        setWorkspace(location.state.workspace);
        setIsResolvingWorkspace(false);
        return;
      }

      if (!authSession?.token) {
        setIsResolvingWorkspace(false);
        return;
      }

      setIsResolvingWorkspace(true);

      try {
        const result = await fetchWorkspaces(authSession.token);
        const workspaces = Array.isArray(result?.workspaces) ? result.workspaces : [];
        const matchedWorkspace = workspaces.find((item) => item.slug === workspaceSlug);

        setWorkspace(matchedWorkspace || null);
      } catch (error) {
        await showErrorAlert(
          "Unable to load workspace",
          error.message || "Something went wrong while loading the workspace."
        );
      } finally {
        setIsResolvingWorkspace(false);
      }
    };

    void resolveWorkspace();
  }, [authSession?.token, location.state, workspaceSlug]);

  useEffect(() => {
    if (isResolvingWorkspace || workspace) {
      return;
    }

    navigate(APP_ROUTES.workspace, { replace: true });
  }, [isResolvingWorkspace, navigate, workspace]);

  return (
    <AppLayout
      sidebar={<ProjectsSidebar workspaceName={workspaceSlug} />}
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
