import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Modal,
  ModalClose,
  ModalDialog,
  Option,
  Select,
  Stack,
  Typography,
} from "@mui/joy";

const roleOptions = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function EditProjectUserModal({
  open,
  values,
  disableRoleChange = false,
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
                Edit project user
              </Typography>
              <Typography level="body-sm" sx={{ color: "var(--color-font-primary)" }}>
                Update the user&apos;s project role and access status.
              </Typography>
            </Stack>

            <FormControl required>
              <FormLabel>Role</FormLabel>
              <Select
                value={values.role}
                onChange={(_, value) => onChange("role", value || "")}
                placeholder="Select role"
                disabled={disableRoleChange}
              >
                {roleOptions.map((role) => (
                  <Option key={role.value} value={role.value}>
                    {role.label}
                  </Option>
                ))}
              </Select>
              {disableRoleChange ? (
                <Typography level="body-xs" sx={{ mt: 0.5, color: "#7b8596" }}>
                  Project owner role cannot be changed here.
                </Typography>
              ) : null}
            </FormControl>

            <FormControl required>
              <FormLabel>Status</FormLabel>
              <Select
                value={values.status}
                onChange={(_, value) => onChange("status", value || "")}
                placeholder="Select status"
              >
                {statusOptions.map((status) => (
                  <Option key={status.value} value={status.value}>
                    {status.label}
                  </Option>
                ))}
              </Select>
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
