import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";

export default function EditWorkspaceModal({
  open,
  values,
  loading,
  onClose,
  onChange,
  onSubmit,
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout="center"
        sx={{
          width: "100%",
          maxWidth: 480,
          borderRadius: "16px",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
        }}
      >
        <ModalClose />

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography
                level="title-lg"
                sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}
              >
                Edit workspace
              </Typography>
              <Typography level="body-sm" sx={{ color: "var(--color-font-primary)" }}>
                Update the workspace name and description.
              </Typography>
            </Stack>

            <FormControl required>
              <FormLabel>Workspace name</FormLabel>
              <Input
                value={values.workspaceName}
                onChange={(event) => onChange("workspaceName", event.target.value)}
                placeholder="Enter workspace name"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                minRows={4}
                value={values.workspaceDescription}
                onChange={(event) => onChange("workspaceDescription", event.target.value)}
                placeholder="Enter workspace description"
              />
            </FormControl>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="plain" color="neutral" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={loading} sx={{ color: "var(--color-font-secondary)" }}>
                Save changes
              </Button>
            </Stack>
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
