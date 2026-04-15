import { useAuthContext } from "../context/AuthContext";
import AppLayout from "../components/app/AppLayout";
import WorkspaceMain from "../components/workspace/WorkspaceMain";
import WorkspaceSidebar from "../components/workspace/WorkspaceSidebar";

export default function WorkspacePage() {
  const { authSession } = useAuthContext();
  const currentYear = new Date().getFullYear();
  const firstName = authSession?.user?.firstName || "Ankit";
  const lastName = authSession?.user?.lastName || "Meshram";
  const userRole = authSession?.user?.role || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initial = firstName.charAt(0).toUpperCase() || "A";

  return (
    <AppLayout
      sidebar={<WorkspaceSidebar />}
      title="Workspaces"
      fullName={fullName}
      initial={initial}
      userRole={userRole}
      currentYear={currentYear}
    >
      <WorkspaceMain />
    </AppLayout>
  );
}
