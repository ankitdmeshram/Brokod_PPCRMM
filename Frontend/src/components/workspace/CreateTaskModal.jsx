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
  Typography,
} from "@mui/joy";
import { useEffect, useState } from "react";
import { showConfirmAlert } from "../../services/alert.service";
import RichTextEditor from "../common/RichTextEditor";

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

const areTaskFormValuesDirty = (values, initialValues) =>
  values.title !== initialValues.title ||
  values.description !== initialValues.description ||
  values.status !== initialValues.status ||
  values.priority !== initialValues.priority ||
  values.taskType !== initialValues.taskType ||
  values.assignedBy !== initialValues.assignedBy ||
  values.assignedTo !== initialValues.assignedTo ||
  values.createdBy !== initialValues.createdBy ||
  values.startDate !== initialValues.startDate ||
  values.dueDate !== initialValues.dueDate ||
  values.completedDate !== initialValues.completedDate ||
  values.projectId !== initialValues.projectId ||
  values.workspaceId !== initialValues.workspaceId ||
  values.comments !== initialValues.comments ||
  values.activityLogs !== initialValues.activityLogs ||
  JSON.stringify(values.tags) !== JSON.stringify(initialValues.tags);

export default function CreateTaskModal({
  open,
  initialValues,
  projectUserOptions = [],
  loading,
  onClose,
  onSubmit,
}) {
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [initialValues, open]);

  const handleFieldChange = (field, value) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleClose = async (forceClose = false) => {
    if (loading) {
      return;
    }

    if (!forceClose && areTaskFormValuesDirty(values, initialValues)) {
      const confirmation = await showConfirmAlert(
        "Discard task draft?",
        "You have unsaved task changes. Closing now will discard them.",
        {
          confirmButtonText: "Discard",
          cancelButtonText: "Keep Editing",
        }
      );

      if (!confirmation.isConfirmed) {
        return;
      }
    }

    onClose();
  };

  const createdByOption =
    projectUserOptions.find((option) => Number(option.id) === Number(values.createdBy)) || null;

  return (
    <Modal
      open={open}
      onClose={() => {
        void handleClose();
      }}
    >
      <ModalDialog
        layout="center"
        sx={{
          width: "100%",
          borderRadius: "16px",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          overflow: "visible",
        }}
      >
        <ModalClose
          onClick={(event) => {
            event.preventDefault();
            void handleClose();
          }}
        />

        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(values);
          }}
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
                  onChange={(event) => handleFieldChange("title", event.target.value)}
                  placeholder="Enter task title"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <RichTextEditor
                  value={values.description}
                  onChange={(value) => handleFieldChange("description", value)}
                  placeholder="Describe the task scope, intent, and expected outcome"
                  minHeight={180}
                />
              </FormControl>
            </Stack>

            <Stack spacing={1}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={values.status}
                    onChange={(_, value) => handleFieldChange("status", value || "")}
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
                    onChange={(_, value) => handleFieldChange("priority", value || "")}
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
                    onChange={(_, value) => handleFieldChange("taskType", value || "")}
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
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Assigned by</FormLabel>
                  <Select
                    value={values.assignedBy}
                    onChange={(_, value) => handleFieldChange("assignedBy", value || "")}
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
                    onChange={(_, value) => handleFieldChange("assignedTo", value || "")}
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
                    onChange={(event) => handleFieldChange("startDate", event.target.value)}
                  />
                </FormControl>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Due date</FormLabel>
                  <Input
                    type="date"
                    value={values.dueDate}
                    onChange={(event) => handleFieldChange("dueDate", event.target.value)}
                  />
                </FormControl>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Completed date</FormLabel>
                  <Input
                    type="date"
                    value={values.completedDate}
                    onChange={(event) => handleFieldChange("completedDate", event.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              <FormControl>
                <FormLabel>Tags</FormLabel>
                <Autocomplete
                  multiple
                  freeSolo
                  options={tagSuggestions}
                  value={values.tags}
                  onChange={(_, value) => handleFieldChange("tags", value)}
                  placeholder="Add task tags"
                />
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="plain"
                color="neutral"
                onClick={() => {
                  void handleClose();
                }}
              >
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
