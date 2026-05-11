import {
  Autocomplete,
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
  Textarea,
  Typography,
} from "@mui/joy";

const statusOptions = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const accessOptions = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
];

const tagSuggestions = ["Design", "Frontend", "Backend", "Mobile", "UI", "Data"];

export default function EditProjectModal({
  open,
  values,
  workspaceTitle,
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
          maxWidth: 720,
          maxHeight: "min(88vh, 820px)",
          borderRadius: "16px",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          overflowY: "auto",
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
                Edit project
              </Typography>
              <Typography level="body-sm" sx={{ color: "var(--color-font-primary)" }}>
                Update the project details for {workspaceTitle || "this workspace"}.
              </Typography>
            </Stack>

            <FormControl required>
              <FormLabel>Project name</FormLabel>
              <Input
                value={values.projectName}
                onChange={(event) => onChange("projectName", event.target.value)}
                placeholder="Enter project name"
              />
            </FormControl>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl sx={{ flex: 1 }}>
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

              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Project access</FormLabel>
                <Select
                  value={values.access}
                  onChange={(_, value) => onChange("access", value || "")}
                  placeholder="Select project access"
                >
                  {accessOptions.map((access) => (
                    <Option key={access.value} value={access.value}>
                      {access.label}
                    </Option>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Start date</FormLabel>
                <Input
                  type="date"
                  value={values.startDate}
                  onChange={(event) => onChange("startDate", event.target.value)}
                />
              </FormControl>

              <FormControl sx={{ flex: 1 }}>
                <FormLabel>End date</FormLabel>
                <Input
                  type="date"
                  value={values.endDate}
                  onChange={(event) => onChange("endDate", event.target.value)}
                />
              </FormControl>
            </Stack>

            <FormControl>
              <FormLabel>Tags</FormLabel>
              <Autocomplete
                multiple
                freeSolo
                options={tagSuggestions}
                value={values.tags}
                onChange={(_, value) => onChange("tags", value)}
                placeholder="Add tags"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                minRows={4}
                value={values.description}
                onChange={(event) => onChange("description", event.target.value)}
                placeholder="Enter project description"
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
