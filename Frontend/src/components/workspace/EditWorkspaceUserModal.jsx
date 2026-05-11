import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
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

export default function EditWorkspaceUserModal({
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
          maxWidth: 520,
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
                Edit user
              </Typography>
              <Typography level="body-sm" sx={{ color: "var(--color-font-primary)" }}>
                Update the member details and workspace role.
              </Typography>
            </Stack>

            <FormControl required>
              <FormLabel>Name</FormLabel>
              <Input
                value={values.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Enter name"
              />
            </FormControl>

            <FormControl required>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={values.email}
                onChange={(event) => onChange("email", event.target.value)}
                placeholder="Enter email"
              />
            </FormControl>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Phone</FormLabel>
                <Input
                  value={values.phone}
                  onChange={(event) => onChange("phone", event.target.value)}
                  placeholder="Enter phone number (optional)"
                />
              </FormControl>

              <FormControl required sx={{ flex: 1 }}>
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
                    You cannot change your own workspace role.
                  </Typography>
                ) : null}
              </FormControl>
            </Stack>

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
