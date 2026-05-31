import { Box, Sheet } from "@mui/joy";

export default function QuotePanel() {
  const teamIllustrationSrc = `${import.meta.env.BASE_URL}Team.svg`;

  return (
    <Sheet
      sx={{
        display: "flex",
        alignItems: "center",
        height: "100%",
        justifyContent: "center",
        px: { xs: 2.5, sm: 4 },
        py: { xs: 4, sm: 5 },
        borderRadius: 0,
        backgroundColor: "var(--color-primary)",
        color: "var(--color-font-secondary)",
      }}
    >
      <Box
        component="img"
        src={teamIllustrationSrc}
        alt="Team illustration"
        sx={{
          width: "100%",
          maxWidth: 360,
          height: "auto",
          objectFit: "contain",
        }}
      />
    </Sheet>
  );
}
