import { Box, Sheet, Stack } from "@mui/joy";

export default function AuthShell({ showQuotePanel, quotePanel, header, form, footer }) {
  const isCompact = !showQuotePanel;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 4,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.96), rgba(240,244,252,0.98) 46%, var(--color-background) 100%)",
      }}
    >
      <Sheet
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 760,
          p: 0,
          borderRadius: "8px",
          borderColor: "rgba(194, 206, 230, 0.6)",
          backgroundColor: "rgba(255,255,255,0.94)",
          boxShadow: "0 18px 55px rgba(164, 178, 209, 0.2)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: showQuotePanel
              ? { xs: "1fr", md: "1fr 1fr" }
              : "1fr",
            gap: 0,
          }}
        >
          {showQuotePanel ? (
            <Box sx={{ backgroundColor: "var(--color-primary)" }}>{quotePanel}</Box>
          ) : null}

          <Sheet
            variant="plain"
            sx={{
              px: { xs: 2, sm: isCompact ? 4 : 3.5 },
              py: { xs: 3, sm: isCompact ? 3.25 : 4 },
              borderRadius: 0,
              backgroundColor: "#fff",
            }}
          >
            <Stack spacing={isCompact ? 2.25 : 3}>
              {header}
              {form}
              {footer}
            </Stack>
          </Sheet>
        </Box>
      </Sheet>
    </Box>
  );
}
