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
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const taskTypeOptions = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug" },
  { value: "improvement", label: "Improvement" },
  { value: "research", label: "Research" },
];

const tagSuggestions = ["Planning", "Backend", "Frontend", "Bugfix", "Research", "Sprint"];

export default function CreateTaskModal({
  open,
  values,
  projectUserOptions = [],
  loading,
  onClose,
  onChange,
  onSubmit,
}) {
  const createdByOption =
    projectUserOptions.find((option) => Number(option.id) === Number(values.createdBy)) || null;

  return (
    <Modal
      open={open}
      onClose={() => {
        void onClose();
      }}
    >
      <ModalDialog
        layout="center"
        sx={{
          // width: "calc(100vw - 2rem)",
          // maxWidth: "calc(100vw - 2rem)",
          // height: "calc(100vh - 2rem)",
          // maxHeight: "calc(100vh - 2rem)",
          // m: "1rem",
          width: "100%",
          borderRadius: "16px",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          overflow: "hidden",
        }}
      >
        <ModalClose
          onClick={(event) => {
            event.preventDefault();
            void onClose();
          }}
        />

        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            mx: { xs: -2, sm: -3 },
            px: { xs: 2, sm: 3 },
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(120, 130, 154, 0.5) transparent",
            "&::-webkit-scrollbar": {
              width: "5px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(120, 130, 154, 0.5)",
              borderRadius: "999px",
            },
          }}
        >
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography
                level="title-lg"
                sx={{ fontWeight: 700, color: "var(--color-font-primary)" }}
              >
                Create task
              </Typography>
            </Stack>

            <Stack spacing={1}>
              <FormControl required>
                <FormLabel>Task title</FormLabel>
                <Input
                  value={values.title}
                  onChange={(event) => onChange("title", event.target.value)}
                  placeholder="Enter task title"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  minRows={4}
                  value={values.description}
                  onChange={(event) => onChange("description", event.target.value)}
                  placeholder="Describe the task scope, intent, and expected outcome"
                />
              </FormControl>
            </Stack>

            <Stack spacing={1}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={values.status}
                    onChange={(_, value) => onChange("status", value || "")}
                    placeholder="Select status"
                  >
                    {statusOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    value={values.priority}
                    onChange={(_, value) => onChange("priority", value || "")}
                    placeholder="Select priority"
                  >
                    {priorityOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Task type</FormLabel>
                  <Select
                    value={values.taskType}
                    onChange={(_, value) => onChange("taskType", value || "")}
                    placeholder="Select type"
                  >
                    {taskTypeOptions.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Assigned by</FormLabel>
                  <Select
                    value={values.assignedBy}
                    onChange={(_, value) => onChange("assignedBy", value || "")}
                    placeholder="Select assigner"
                  >
                    {projectUserOptions.map((option) => (
                      <Option key={option.id} value={String(option.id)}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Assigned to</FormLabel>
                  <Select
                    value={values.assignedTo}
                    onChange={(_, value) => onChange("assignedTo", value || "")}
                    placeholder="Select assignee"
                  >
                    {projectUserOptions.map((option) => (
                      <Option key={option.id} value={String(option.id)}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Created by</FormLabel>
                  <Input
                    value={createdByOption?.label || ""}
                    placeholder="Task creator"
                    readOnly
                  />
                </FormControl>
              </Stack>
            </Stack>

            <Stack spacing={1}>
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
                  <FormLabel>Due date</FormLabel>
                  <Input
                    type="date"
                    value={values.dueDate}
                    onChange={(event) => onChange("dueDate", event.target.value)}
                  />
                </FormControl>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Completed date</FormLabel>
                  <Input
                    type="date"
                    value={values.completedDate}
                    onChange={(event) => onChange("completedDate", event.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Project ID</FormLabel>
                  <Input
                    value={values.projectId}
                    onChange={(event) => onChange("projectId", event.target.value)}
                    placeholder="Project ID"
                    readOnly
                  />
                </FormControl>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Workspace ID</FormLabel>
                  <Input
                    value={values.workspaceId}
                    onChange={(event) => onChange("workspaceId", event.target.value)}
                    placeholder="Workspace ID"
                    readOnly
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
                  placeholder="Add task tags"
                />
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="plain" color="neutral" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={loading} sx={{ color: "var(--color-font-secondary)" }}>
                Create task
              </Button>
            </Stack>
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
