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

const modeOptions = [
  { value: "existing_workspace_user", label: "Add existing workspace user" },
  { value: "invite_user", label: "Invite user" },
];

const roleOptions = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

export default function AddProjectUserModal({
  open,
  values,
  loading,
  workspaceUsers = [],
  onClose,
  onChange,
  onSubmit,
}) {
  const isExistingWorkspaceUserMode = values.mode === "existing_workspace_user";

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout="center"
        sx={{
          width: "100%",
          maxWidth: 560,
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
                Add user
              </Typography>
              <Typography level="body-sm" sx={{ color: "var(--color-font-primary)" }}>
                Add an existing workspace member to this project or invite someone new.
              </Typography>
            </Stack>

            <FormControl required>
              <FormLabel>Option</FormLabel>
              <Select
                value={values.mode}
                onChange={(_, value) => onChange("mode", value || "existing_workspace_user")}
              >
                {modeOptions.map((option) => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </FormControl>

            {isExistingWorkspaceUserMode ? (
              <FormControl required>
                <FormLabel>Workspace user</FormLabel>
                <Select
                  value={values.userId}
                  onChange={(_, value) => onChange("userId", value || "")}
                  placeholder="Select existing workspace user"
                >
                  {workspaceUsers.map((user) => {
                    const fullName =
                      `${String(user.firstName || "").trim()} ${String(user.lastName || "").trim()}`.trim() ||
                      user.email;

                    return (
                      <Option key={user.id} value={String(user.id)}>
                        {fullName} {user.email ? `(${user.email})` : ""}
                      </Option>
                    );
                  })}
                </Select>
              </FormControl>
            ) : (
              <>
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

                <FormControl>
                  <FormLabel>Phone</FormLabel>
                  <Input
                    value={values.phone}
                    onChange={(event) => onChange("phone", event.target.value)}
                    placeholder="Enter phone number (optional)"
                  />
                </FormControl>
              </>
            )}

            <FormControl required>
              <FormLabel>Role</FormLabel>
              <Select
                value={values.role}
                onChange={(_, value) => onChange("role", value || "")}
                placeholder="Select role"
              >
                {roleOptions.map((role) => (
                  <Option key={role.value} value={role.value}>
                    {role.label}
                  </Option>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="plain" color="neutral" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={loading} sx={{ color: "var(--color-font-secondary)" }}>
                Add user
              </Button>
            </Stack>
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
