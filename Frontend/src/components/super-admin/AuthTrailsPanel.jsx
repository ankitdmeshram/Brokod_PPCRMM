import KeyboardArrowLeftRounded from "@mui/icons-material/KeyboardArrowLeftRounded";
import KeyboardArrowRightRounded from "@mui/icons-material/KeyboardArrowRightRounded";
import {
  Box,
  Button,
  Chip,
  DialogContent,
  DialogTitle,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  LinearProgress,
  Modal,
  ModalClose,
  ModalDialog,
  Option,
  Select,
  Sheet,
  Stack,
  Table,
  Typography,
} from "@mui/joy";
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { showErrorAlert } from "../../services/alert.service";
import { fetchAuthTrails } from "../../services/auth-trail.service";
import {
  FilterIcon,
  RefreshIcon,
  SearchIcon,
} from "../workspace/WorkspaceIcons";

const emptyFilters = {
  id: "",
  userId: "",
  attemptedEmail: "",
  eventType: "",
  outcome: "",
  failureReason: "",
  ipAddress: "",
  userAgent: "",
  requestId: "",
  sessionId: "",
  createdAt: "",
  createdFrom: "",
  createdTo: "",
};

const textFilters = [
  { key: "id", label: "Trail ID", type: "number" },
  { key: "userId", label: "User ID", type: "number" },
  { key: "attemptedEmail", label: "Attempted email" },
  { key: "failureReason", label: "Failure reason" },
  { key: "ipAddress", label: "IP address" },
  { key: "userAgent", label: "User agent" },
  { key: "requestId", label: "Request ID" },
  { key: "sessionId", label: "Session ID" },
];

const dateFilters = [
  { key: "createdAt", label: "Created at (exact)" },
  { key: "createdFrom", label: "Created from" },
  { key: "createdTo", label: "Created to" },
];

const compactText = (value, maxLength = 34) => {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text || "—";
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const getPaginationItems = (currentPage, totalPages) => {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
};

export default function AuthTrailsPanel() {
  const { authSession } = useAuthContext();
  const [authTrails, setAuthTrails] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(searchValue.trim()), 300);
    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, appliedFilters, rowsPerPage]);

  useEffect(() => {
    let isCurrentRequest = true;

    const loadAuthTrails = async () => {
      if (!authSession?.token) {
        setAuthTrails([]);
        setTotal(0);
        setTotalPages(1);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const result = await fetchAuthTrails(authSession.token, {
          search: debouncedSearch,
          ...appliedFilters,
          page: currentPage,
          limit: rowsPerPage,
        });

        if (!isCurrentRequest) {
          return;
        }

        setAuthTrails(Array.isArray(result?.authTrails) ? result.authTrails : []);
        setTotal(Number(result?.pagination?.total || 0));
        setTotalPages(Math.max(1, Number(result?.pagination?.totalPages || 1)));
      } catch (error) {
        if (!isCurrentRequest) {
          return;
        }

        setAuthTrails([]);
        setTotal(0);
        setTotalPages(1);
        await showErrorAlert(
          "Unable to load authentication trails",
          error.message || "Something went wrong while loading authentication trails."
        );
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      }
    };

    void loadAuthTrails();

    return () => {
      isCurrentRequest = false;
    };
  }, [
    appliedFilters,
    authSession?.token,
    currentPage,
    debouncedSearch,
    refreshVersion,
    rowsPerPage,
  ]);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = total === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1;
  const pageEnd = total === 0 ? 0 : Math.min(safeCurrentPage * rowsPerPage, total);
  const paginationItems = useMemo(
    () => getPaginationItems(safeCurrentPage, totalPages),
    [safeCurrentPage, totalPages]
  );
  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter((value) => String(value || "").trim()).length,
    [appliedFilters]
  );

  useEffect(() => {
    if (safeCurrentPage !== currentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const updateFilter = (key, value) => {
    setDraftFilters((current) => ({ ...current, [key]: value || "" }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(emptyFilters);
  };

  const openFilterModal = () => {
    setDraftFilters({ ...appliedFilters });
    setIsFilterModalOpen(true);
  };

  const closeFilterModal = () => {
    setDraftFilters({ ...appliedFilters });
    setIsFilterModalOpen(false);
  };

  return (
    <Sheet
      variant="outlined"
      sx={{
        width: "100%",
        borderRadius: "10px",
        borderColor: "rgba(220, 226, 244, 0.95)",
        backgroundColor: "#fff",
        overflow: "hidden",
        boxShadow: "0 16px 34px rgba(157, 171, 208, 0.14)",
      }}
    >
      <Stack spacing={0}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", lg: "center" }}
          sx={{ px: 2.5, py: 2.5 }}
        >
          <Stack spacing={0.5}>
            <Typography level="title-lg" sx={{ fontWeight: 700, color: "#1f2a44" }}>
              Authentication Activities
            </Typography>
            <Typography level="body-sm" sx={{ color: "#5c6d90" }}>
              Search, filter, and review every recorded authentication event.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Input
              startDecorator={<SearchIcon />}
              placeholder="Search email or user ID"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              sx={{ minWidth: { sm: 290 }, borderRadius: "10px" }}
            />
            <Button
              variant={activeFilterCount ? "soft" : "outlined"}
              startDecorator={<FilterIcon />}
              endDecorator={
                activeFilterCount ? (
                  <Chip size="sm" variant="solid" color="primary">
                    {activeFilterCount}
                  </Chip>
                ) : null
              }
              onClick={openFilterModal}
              sx={{ borderRadius: "10px", whiteSpace: "nowrap" }}
            >
              Filters
            </Button>
            <IconButton
              variant="outlined"
              title="Refresh authentication trails"
              onClick={() => setRefreshVersion((version) => version + 1)}
              sx={{ borderRadius: "10px" }}
            >
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Modal open={isFilterModalOpen} onClose={closeFilterModal}>
          <ModalDialog
            layout="center"
            sx={{
              width: "min(1120px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 48px)",
              borderRadius: "14px",
              p: 0,
              overflow: "hidden",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ px: { xs: 2, md: 2.5 }, py: 2, pr: 6, borderBottom: "1px solid #e4e9f5" }}
            >
              <FilterIcon sx={{ color: "#3155ff" }} />
              <DialogTitle sx={{ p: 0, color: "#1f2a44" }}>Column filters</DialogTitle>
              <ModalClose />
            </Stack>

            <DialogContent sx={{ px: { xs: 2, md: 2.5 }, py: 2.25, overflow: "auto" }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 1.5,
                }}
              >
                {textFilters.map((filter) => (
                  <FormControl key={filter.key}>
                    <FormLabel>{filter.label}</FormLabel>
                    <Input
                      type={filter.type || "text"}
                      slotProps={filter.type === "number" ? { input: { min: 1 } } : undefined}
                      value={draftFilters[filter.key]}
                      onChange={(event) => updateFilter(filter.key, event.target.value)}
                    />
                  </FormControl>
                ))}

                <FormControl>
                  <FormLabel>Event type</FormLabel>
                  <Select
                    value={draftFilters.eventType || null}
                    placeholder="All event types"
                    onChange={(_, value) => updateFilter("eventType", value)}
                  >
                    <Option value="signin">Signin</Option>
                    <Option value="signout">Signout</Option>
                    <Option value="signup">Signup</Option>
                    <Option value="token_rejected">Token rejected</Option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Outcome</FormLabel>
                  <Select
                    value={draftFilters.outcome || null}
                    placeholder="All outcomes"
                    onChange={(_, value) => updateFilter("outcome", value)}
                  >
                    <Option value="success">Success</Option>
                    <Option value="failure">Failure</Option>
                  </Select>
                </FormControl>

                {dateFilters.map((filter) => (
                  <FormControl key={filter.key}>
                    <FormLabel>{filter.label}</FormLabel>
                    <Input
                      type="datetime-local"
                      slotProps={{ input: { step: 1 } }}
                      value={draftFilters[filter.key]}
                      onChange={(event) => updateFilter(filter.key, event.target.value)}
                    />
                  </FormControl>
                ))}
              </Box>
            </DialogContent>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              sx={{ px: { xs: 2, md: 2.5 }, py: 1.75, borderTop: "1px solid #e4e9f5" }}
            >
              <Button variant="plain" color="neutral" onClick={resetFilters}>
                Reset
              </Button>
              <Button startDecorator={<FilterIcon />} onClick={applyFilters}>
                Apply filters
              </Button>
            </Stack>
          </ModalDialog>
        </Modal>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          {isLoading ? <LinearProgress /> : null}
          <Table
            stickyHeader
            borderAxis="xBetween"
            sx={{
              minWidth: 2050,
              "& thead th": {
                py: 1.25,
                px: 1.5,
                color: "#60708e",
                fontWeight: 700,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                backgroundColor: "#f5f7ff",
              },
              "& tbody td": {
                py: 1.2,
                px: 1.5,
                color: "#1f2a44",
                backgroundColor: "#fff",
                verticalAlign: "middle",
              },
              "& tbody tr:hover td": { backgroundColor: "#f9fbff" },
            }}
          >
            <thead>
              <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Attempted email</th>
                <th>Event</th>
                <th>Outcome</th>
                <th>Failure reason</th>
                <th>IP address</th>
                <th>User agent</th>
                <th>Request ID</th>
                <th>Session ID</th>
                <th>Created at</th>
              </tr>
            </thead>
            <tbody>
              {authTrails.map((trail) => (
                <tr key={trail.id}>
                  <td>{trail.id}</td>
                  <td>{trail.userId ?? "—"}</td>
                  <td title={trail.attemptedEmail || ""}>{trail.attemptedEmail || "—"}</td>
                  <td>
                    <Chip size="sm" variant="soft" color="primary">
                      {trail.eventType}
                    </Chip>
                  </td>
                  <td>
                    <Chip
                      size="sm"
                      variant="soft"
                      color={trail.outcome === "success" ? "success" : "danger"}
                    >
                      {trail.outcome}
                    </Chip>
                  </td>
                  <td title={trail.failureReason || ""}>{trail.failureReason || "—"}</td>
                  <td>{trail.ipAddress || "—"}</td>
                  <td title={trail.userAgent || ""}>{compactText(trail.userAgent, 46)}</td>
                  <td title={trail.requestId || ""}>{compactText(trail.requestId)}</td>
                  <td title={trail.sessionId || ""}>{compactText(trail.sessionId)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(trail.createdAt)}</td>
                </tr>
              ))}
              {!isLoading && authTrails.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <Stack alignItems="center" spacing={0.75} sx={{ py: 5 }}>
                      <Typography sx={{ fontWeight: 700 }}>No authentication trails found</Typography>
                      <Typography level="body-sm" sx={{ color: "#7b8596" }}>
                        Try changing the search text or column filters.
                      </Typography>
                    </Stack>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ px: 2.25, py: 1.75, borderTop: "1px solid rgba(223, 228, 243, 0.9)" }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography level="body-sm" sx={{ color: "#60708e" }}>
              Rows per page
            </Typography>
            <Select
              size="sm"
              value={rowsPerPage}
              onChange={(_, value) => value && setRowsPerPage(value)}
              sx={{ minWidth: 76 }}
            >
              <Option value={5}>5</Option>
              <Option value={10}>10</Option>
              <Option value={25}>25</Option>
              <Option value={50}>50</Option>
              <Option value={100}>100</Option>
            </Select>
            <Typography level="body-sm" sx={{ color: "#60708e" }}>
              {total ? `${pageStart}-${pageEnd} of ${total}` : "0 of 0"}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
            <IconButton
              variant="plain"
              disabled={safeCurrentPage <= 1 || total === 0}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <KeyboardArrowLeftRounded />
            </IconButton>
            {paginationItems.map((pageNumber, index) => {
              const previousPage = paginationItems[index - 1];
              const showGap = previousPage && pageNumber - previousPage > 1;

              return (
                <Stack key={pageNumber} direction="row" spacing={0.75} alignItems="center">
                  {showGap ? <Typography sx={{ color: "#98a3bd" }}>…</Typography> : null}
                  <Button
                    variant={pageNumber === safeCurrentPage ? "soft" : "plain"}
                    onClick={() => setCurrentPage(pageNumber)}
                    sx={{ minWidth: 36, height: 34, p: 0 }}
                  >
                    {pageNumber}
                  </Button>
                </Stack>
              );
            })}
            <IconButton
              variant="plain"
              disabled={safeCurrentPage >= totalPages || total === 0}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              <KeyboardArrowRightRounded />
            </IconButton>
          </Stack>
        </Stack>
      </Stack>
    </Sheet>
  );
}
