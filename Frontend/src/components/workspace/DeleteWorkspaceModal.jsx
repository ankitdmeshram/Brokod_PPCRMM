import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import { DeleteIcon } from "./WorkspaceIcons";

export default function DeleteWorkspaceModal({
  open,
  workspaceName,
  confirmText,
  loading,
  onClose,
  onChange,
  onSubmit,
}) {
  const isConfirmMatched = confirmText.trim().toLowerCase() === "delete";

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout="center"
        sx={{
          width: "100%",
          maxWidth: 500,
          borderRadius: "16px",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
        }}
      >
        <ModalClose />

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2.25}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Sheet
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "12px",
                  backgroundColor: "rgba(220, 38, 38, 0.1)",
                  color: "#dc2626",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <DeleteIcon />
              </Sheet>

              <Stack spacing={0.75}>
                <Typography
                  level="title-lg"
                  sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}
                >
                  Delete workspace
                </Typography>
                <Typography level="body-sm" sx={{ color: "#475569", lineHeight: 1.6 }}>
                  You are about to remove <strong>{workspaceName}</strong> from the active
                  workspace list.
                </Typography>
              </Stack>
            </Stack>

            <Sheet
              variant="soft"
              color="danger"
              sx={{
                borderRadius: "12px",
                px: 1.5,
                py: 1.25,
                backgroundColor: "rgba(220, 38, 38, 0.08)",
              }}
            >
              <Stack spacing={0.5}>
                <Typography level="body-sm" sx={{ fontWeight: 700, color: "#b91c1c" }}>
                  Before you continue
                </Typography>
                <Typography level="body-sm" sx={{ color: "#7f1d1d", lineHeight: 1.6 }}>
                  This action will remove the workspace from your current view.
                </Typography>
              </Stack>
            </Sheet>

            <FormControl required>
              <FormLabel>Type delete to confirm</FormLabel>
              <Input
                value={confirmText}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Type delete"
                color={confirmText ? (isConfirmMatched ? "success" : "danger") : "neutral"}
              />
            </FormControl>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="plain" color="neutral" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                color="danger"
                loading={loading}
                disabled={!isConfirmMatched}
              >
                Delete workspace
              </Button>
            </Stack>
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
