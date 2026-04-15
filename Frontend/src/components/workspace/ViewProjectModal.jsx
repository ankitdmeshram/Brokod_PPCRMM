import {
  Chip,
  Modal,
  ModalClose,
  ModalDialog,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";

const statusStyles = {
  Planned: { backgroundColor: "#eef2ff", color: "#3155ff" },
  "In Progress": { backgroundColor: "#e8edff", color: "#3155ff" },
  "On Hold": { backgroundColor: "#eef2ff", color: "#3155ff" },
  Completed: { backgroundColor: "#e9efff", color: "#3155ff" },
  Cancelled: { backgroundColor: "#eef2ff", color: "#3155ff" },
};

function DetailRow({ label, value, children }) {
  return (
    <Stack spacing={0.5}>
      <Typography level="body-xs" sx={{ color: "#60708e", fontWeight: 700, textTransform: "uppercase" }}>
        {label}
      </Typography>
      {children || (
        <Typography level="body-md" sx={{ color: "var(--color-font-primary)", fontWeight: 600 }}>
          {value || "-"}
        </Typography>
      )}
    </Stack>
  );
}

export default function ViewProjectModal({ open, project, workspaceTitle, onClose }) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout="center"
        sx={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "min(88vh, 820px)",
          borderRadius: "16px",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          overflowY: "auto",
        }}
      >
        <ModalClose />

        <Stack spacing={2.25}>
          <Stack spacing={0.5}>
            <Typography
              level="title-lg"
              sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}
            >
              {project?.projectName || "Project details"}
            </Typography>
            <Typography level="body-sm" sx={{ color: "var(--color-font-primary)" }}>
              {workspaceTitle || "Workspace"}
            </Typography>
          </Stack>

          <Sheet
            variant="soft"
            sx={{
              p: 2,
              borderRadius: "8px",
              backgroundColor: "#f8faff",
              border: "1px solid rgba(223, 228, 243, 0.9)",
            }}
          >
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <DetailRow label="Project ID" value={project?.id} />
                <DetailRow label="Owner" value={project?.owner} />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <DetailRow label="Status">
                  <Chip
                    size="sm"
                    variant="soft"
                    sx={{
                      alignSelf: "flex-start",
                      borderRadius: "999px",
                      fontWeight: 600,
                      ...(statusStyles[project?.status] || statusStyles.Planned),
                    }}
                  >
                    {project?.status || "-"}
                  </Chip>
                </DetailRow>
                <DetailRow label="Start Date" value={project?.startDate} />
                <DetailRow label="End Date" value={project?.endDate} />
              </Stack>

              <DetailRow label="Tags">
                {project?.tags?.length ? (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {project.tags.map((tag) => (
                      <Chip
                        key={tag}
                        size="sm"
                        variant="soft"
                        sx={{
                          borderRadius: "999px",
                          backgroundColor: "#eef2ff",
                          color: "#3155ff",
                          fontWeight: 600,
                        }}
                      >
                        {tag}
                      </Chip>
                    ))}
                  </Stack>
                ) : (
                  <Typography level="body-md" sx={{ color: "var(--color-font-primary)", fontWeight: 600 }}>
                    -
                  </Typography>
                )}
              </DetailRow>

              <DetailRow label="Description" value={project?.description} />
            </Stack>
          </Sheet>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
