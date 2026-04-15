import { extendTheme } from "@mui/joy";

export const joyTheme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          solidBg: "var(--color-primary)",
          solidHoverBg: "var(--color-secondary)",
          solidActiveBg: "#1d39cc",
        },
        neutral: {
          outlinedBorder: "rgba(160, 174, 208, 0.45)",
        },
      },
    },
  },
  fontFamily: {
    body: "sans-serif",
    display: "sans-serif",
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "8px",
    xl: "8px",
  },
});
