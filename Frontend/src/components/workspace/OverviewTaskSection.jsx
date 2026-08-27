import { Chip, Sheet, Stack, Typography } from "@mui/joy";
import OverviewSectionCard from "./OverviewSectionCard";

const scrollableListStyles = {
  maxHeight: 392,
  overflowY: "auto",
  pr: 0.5,
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(120, 130, 154, 0.55) transparent",
  "&::-webkit-scrollbar": {
    width: "6px",
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(120, 130, 154, 0.55)",
    borderRadius: "999px",
  },
};

const defaultTaskCardSx = {
  p: 1.5,
  borderRadius: "14px",
  backgroundColor: "#f8faff",
  border: "1px solid rgba(220, 226, 244, 0.85)",
  transition: "transform 160ms ease, box-shadow 160ms ease",
};

const toTitleCase = (value = "") =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDateLabel = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function OverviewTaskSection({
  title,
  description,
  countLabel,
  chipSx,
  items = [],
  emptyMessage,
  loadingMessage,
  isLoading = false,
  onTaskClick,
  statusChipStyles = {},
}) {
  const shouldScroll = items.length > 4;

  return (
    <OverviewSectionCard
      title={title}
      description={description}
      countLabel={isLoading ? "Loading..." : countLabel}
      chipSx={chipSx}
    >
      {isLoading ? (
        <Typography level="body-sm" sx={{ color: "#60708e" }}>
          {loadingMessage}
        </Typography>
      ) : items.length ? (
        <Stack spacing={1} sx={shouldScroll ? scrollableListStyles : undefined}>
          {items.map((task) => {
            const statusLabel = toTitleCase(task.status);
            const isClickable = typeof onTaskClick === "function" && Boolean(task.slug);

            return (
              <Sheet
                key={task.id}
                variant="soft"
                onClick={() => {
                  if (isClickable) {
                    onTaskClick(task);
                  }
                }}
                sx={{
                  ...defaultTaskCardSx,
                  cursor: isClickable ? "pointer" : "default",
                  "&:hover": isClickable
                    ? {
                        transform: "translateY(-1px)",
                        boxShadow: "0 14px 28px rgba(170, 180, 214, 0.12)",
                      }
                    : {},
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                >
                  <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                    <Typography
                      level="title-md"
                      sx={{ fontWeight: 600, color: "var(--color-font-primary)" }}
                    >
                      {task.title || "Untitled task"}
                    </Typography>
                    <Typography level="body-sm" sx={{ color: "#60708e" }}>
                      Due {formatDateLabel(task.dueDate)}
                      {task.projectName ? ` | ${task.projectName}` : ""}
                      {task.assignedToName ? ` | Assigned to ${task.assignedToName}` : ""}
                    </Typography>
                  </Stack>
                  <Chip
                    size="sm"
                    sx={{
                      borderRadius: "999px",
                      fontWeight: 600,
                      ...(statusChipStyles[statusLabel] || statusChipStyles.Todo),
                    }}
                  >
                    {statusLabel}
                  </Chip>
                </Stack>
              </Sheet>
            );
          })}
        </Stack>
      ) : (
        <Typography level="body-sm" sx={{ color: "#60708e" }}>
          {emptyMessage}
        </Typography>
      )}
    </OverviewSectionCard>
  );
}
