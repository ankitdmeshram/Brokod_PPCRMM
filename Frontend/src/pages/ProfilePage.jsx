import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  FormControl,
  FormLabel,
  Input,
  LinearProgress,
  Option,
  Select,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import AppLayout from "../components/app/AppLayout";
import WorkspaceSidebar from "../components/workspace/WorkspaceSidebar";
import { useAuthContext } from "../context/AuthContext";
import { fetchWorkspaces } from "../services/workspace.service";

const toTitleCase = (value = "") =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatJoinedDate = (value) => {
  if (!value) {
    return "Recently joined";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently joined";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

const readTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Not available";

const getSupportedTimeZones = () => {
  const fallbackTimeZone = readTimeZone();

  if (typeof Intl.supportedValuesOf === "function") {
    const supportedTimeZones = Intl.supportedValuesOf("timeZone");

    return supportedTimeZones.includes("UTC")
      ? supportedTimeZones
      : ["UTC", ...supportedTimeZones];
  }

  return ["UTC", fallbackTimeZone].filter(
    (timeZone, index, allTimeZones) => Boolean(timeZone) && allTimeZones.indexOf(timeZone) === index
  );
};

const formatTimeZoneOptionLabel = (timeZone) => {
  try {
    const referenceDate = new Date();
    const offsetParts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(referenceDate);
    const nameParts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "long",
    }).formatToParts(referenceDate);
    const rawOffset = offsetParts.find((part) => part.type === "timeZoneName")?.value || "GMT";
    const timeZoneName =
      nameParts.find((part) => part.type === "timeZoneName")?.value || timeZone;
    const normalizedOffset = rawOffset.startsWith("GMT")
      ? `GMT ${rawOffset.slice(3).trim() || "+00:00"}`
      : rawOffset;

    return `(${normalizedOffset}) ${timeZoneName} (${timeZone})`;
  } catch (_error) {
    return timeZone;
  }
};

const initialProfileFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  timeZone: "",
  memberSince: "",
};

const buildInfoFields = ({
  firstName,
  lastName,
  email,
  phone,
  timeZone,
  joinedDate,
}) => [
  { label: "First Name", value: firstName || "-" },
  { label: "Last Name", value: lastName || "-" },
  { label: "Email Address", value: email || "-" },
  { label: "Phone Number", value: phone || "Not added" },
  { label: "Time Zone", value: timeZone || "UTC" },
  { label: "Member Since", value: joinedDate },
];

export default function ProfilePage() {
  const { authSession, saveCurrentUserProfile } = useAuthContext();
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const currentYear = new Date().getFullYear();
  const firstName = authSession?.user?.firstName || "User";
  const lastName = authSession?.user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const userRole = authSession?.user?.role || "";
  const initial = firstName.charAt(0).toUpperCase() || "U";
  const email = authSession?.user?.email || "";
  const phone = authSession?.user?.phone || "";
  const timeZone = authSession?.user?.timeZone || "UTC";
  const joinedDate = formatJoinedDate(authSession?.user?.createdAt);
  const [profileFormValues, setProfileFormValues] = useState(initialProfileFormValues);
  const timeZoneOptions = useMemo(() => getSupportedTimeZones(), []);

  useEffect(() => {
    const loadWorkspaces = async () => {
      if (!authSession?.token) {
        setWorkspaces([]);
        setIsLoadingWorkspaces(false);
        return;
      }

      setIsLoadingWorkspaces(true);

      try {
        const result = await fetchWorkspaces(authSession.token);
        setWorkspaces(Array.isArray(result?.workspaces) ? result.workspaces : []);
      } catch (_error) {
        setWorkspaces([]);
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };

    void loadWorkspaces();
  }, [authSession?.token]);

  const infoFields = useMemo(
    () =>
      buildInfoFields({
        firstName,
        lastName,
        email,
        phone,
        timeZone,
        joinedDate,
      }),
    [email, firstName, joinedDate, lastName, phone, timeZone]
  );

  const handleEditProfileClick = () => {
    setProfileFormValues({
      firstName,
      lastName,
      email,
      phone,
      timeZone,
      memberSince: joinedDate,
    });
    setIsEditingProfile(true);
  };

  const handleProfileFieldChange = (field, value) => {
    setProfileFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
  };

  const handleSaveProfileDesign = async (event) => {
    event.preventDefault();

    setIsSavingProfile(true);

    try {
      const updatedUser = await saveCurrentUserProfile({
        firstName: profileFormValues.firstName,
        lastName: profileFormValues.lastName,
        email: profileFormValues.email,
        phone: profileFormValues.phone,
        timeZone: profileFormValues.timeZone,
      });

      if (updatedUser) {
        setIsEditingProfile(false);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <AppLayout
      sidebar={<WorkspaceSidebar />}
      title="Profile"
      fullName={fullName}
      initial={initial}
      userRole={userRole}
      currentYear={currentYear}
    >
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          px: { xs: 1.25, md: 2 },
          py: { xs: 1.25, md: 2 },
        }}
      >
        <Sheet
          sx={{
            width: "100%",
            borderRadius: "22px",
            border: "1px solid rgba(220, 226, 244, 0.95)",
            background:
              "linear-gradient(180deg, rgba(245,247,255,0.92) 0%, rgba(255,255,255,1) 16%), #ffffff",
            boxShadow: "0 18px 40px rgba(157, 171, 208, 0.15)",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: 8,
              background: "linear-gradient(90deg, #7c4dff 0%, #5975ff 58%, #84a8ff 100%)",
            }}
          />

          <Stack spacing={0}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              sx={{ px: { xs: 2, md: 3.5 }, py: { xs: 2, md: 3 } }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    fontSize: "1.65rem",
                    fontWeight: 800,
                    color: "#3155ff",
                    background:
                      "linear-gradient(180deg, rgba(124,77,255,0.14) 0%, rgba(89,117,255,0.08) 100%)",
                    boxShadow: "inset 0 0 0 1px rgba(105, 128, 255, 0.12)",
                  }}
                >
                  {initial}
                </Avatar>

                <Stack spacing={0.65}>
                  <Typography
                    level="h2"
                    sx={{
                      fontWeight: 700,
                      color: "#1b2540",
                      fontSize: { xs: "1.5rem", md: "1.9rem" },
                    }}
                  >
                    {fullName}
                  </Typography>
                  <Typography sx={{ color: "#596780", fontSize: "1rem" }}>
                    {email || "No email added"}
                  </Typography>
                  <Stack direction="row" spacing={0.85} useFlexGap flexWrap="wrap">
                    <Chip
                      size="sm"
                      variant="soft"
                      sx={{
                        borderRadius: "999px",
                        backgroundColor: "#eef2ff",
                        color: "#3155ff",
                        fontWeight: 700,
                      }}
                    >
                      {toTitleCase(userRole || "User")}
                    </Chip>
                    <Chip
                      size="sm"
                      variant="soft"
                      sx={{
                        borderRadius: "999px",
                        backgroundColor: "#eefbf3",
                        color: "#1b8f59",
                        fontWeight: 700,
                      }}
                    >
                      Active account
                    </Chip>
                  </Stack>
                </Stack>
              </Stack>

              <Button
                onClick={() => {
                  void handleEditProfileClick();
                }}
                sx={{
                  minWidth: 118,
                  borderRadius: "12px",
                  px: 2.25,
                  py: 1,
                  fontWeight: 700,
                  color: "var(--color-font-secondary)",
                  boxShadow: "0 12px 24px rgba(124, 77, 255, 0.18)",
                }}
              >
                Edit
              </Button>
            </Stack>

            {isLoadingWorkspaces ? (
              <Box sx={{ px: { xs: 2, md: 3.5 } }}>
                <LinearProgress />
              </Box>
            ) : null}

            {isEditingProfile ? (
              <Box
                component="form"
                onSubmit={(event) => {
                  void handleSaveProfileDesign(event);
                }}
              >
                <Box
                  sx={{
                    px: { xs: 2, md: 3.5 },
                    pt: { xs: 1.25, md: 1.75 },
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(300px, 320px))",
                    },
                    justifyContent: "start",
                    columnGap: { xs: 2, md: 3 },
                    rowGap: { xs: 2, md: 2.25 },
                  }}
                >
                  <FormControl required>
                    <FormLabel>First Name</FormLabel>
                    <Input
                      value={profileFormValues.firstName}
                      onChange={(event) => handleProfileFieldChange("firstName", event.target.value)}
                      placeholder="Enter first name"
                      sx={{ borderRadius: "12px" }}
                    />
                  </FormControl>

                  <FormControl required>
                    <FormLabel>Last Name</FormLabel>
                    <Input
                      value={profileFormValues.lastName}
                      onChange={(event) =>
                        handleProfileFieldChange("lastName", event.target.value)
                      }
                      placeholder="Enter last name"
                      sx={{ borderRadius: "12px" }}
                    />
                  </FormControl>

                  <FormControl required>
                    <FormLabel>Email Address</FormLabel>
                    <Input
                      type="email"
                      value={profileFormValues.email}
                      onChange={(event) => handleProfileFieldChange("email", event.target.value)}
                      placeholder="Enter email address"
                      sx={{ borderRadius: "12px" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Phone Number</FormLabel>
                    <Input
                      value={profileFormValues.phone}
                      onChange={(event) => handleProfileFieldChange("phone", event.target.value)}
                      placeholder="Enter phone number"
                      sx={{ borderRadius: "12px" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Time Zone</FormLabel>
                    <Select
                      value={profileFormValues.timeZone}
                      onChange={(_, value) => handleProfileFieldChange("timeZone", value || "")}
                      placeholder="Select time zone"
                      sx={{ borderRadius: "12px" }}
                    >
                      {timeZoneOptions.map((timeZoneOption) => (
                        <Option key={timeZoneOption} value={timeZoneOption}>
                          {formatTimeZoneOptionLabel(timeZoneOption)}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Stack
                  direction={{ xs: "column-reverse", sm: "row" }}
                  spacing={1.25}
                  justifyContent="flex-end"
                  sx={{ px: { xs: 2, md: 3.5 }, pb: { xs: 2.25, md: 3.5 }, pt: 2.5 }}
                >
                  <Button
                    type="button"
                    variant="plain"
                    color="neutral"
                    onClick={handleCancelEdit}
                    disabled={isSavingProfile}
                    sx={{ borderRadius: "12px" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={isSavingProfile}
                    sx={{
                      borderRadius: "12px",
                      minWidth: 144,
                      fontWeight: 700,
                      color: "var(--color-font-secondary)",
                    }}
                  >
                    Save Changes
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Box
                sx={{
                  px: { xs: 2, md: 3.5 },
                  pb: { xs: 2.25, md: 3.5 },
                  pt: { xs: 1.25, md: 1.75 },
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(300px, 320px))",
                  },
                  justifyContent: "start",
                  columnGap: { xs: 2, md: 3 },
                  rowGap: { xs: 2, md: 2.25 },
                }}
              >
                {infoFields.map((field) => (
                  <Stack key={field.label} spacing={0.45}>
                    <Typography
                      level="body-sm"
                      sx={{
                        color: "#6f7f9d",
                        fontWeight: 500,
                      }}
                    >
                      {field.label}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#1f2a44",
                        fontSize: "1.08rem",
                        fontWeight: 500,
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                      }}
                    >
                      {field.value}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            )}
          </Stack>
        </Sheet>
      </Box>
    </AppLayout>
  );
}
