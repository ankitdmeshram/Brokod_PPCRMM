import { Box, Sheet, Stack, Typography } from "@mui/joy";
import ReactECharts from "echarts-for-react";

const buildKpiSparklineOption = (
  data,
  color,
  metricLabel,
  labels = [],
  tooltipValueFormatter = null,
  tooltipValueLabel = ""
) => ({
  animation: false,
  tooltip: {
    show: true,
    trigger: "axis",
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderWidth: 0,
    textStyle: {
      color: "#f8fafc",
      fontSize: 12,
    },
    padding: [8, 10],
    formatter: (params = []) => {
      const point = Array.isArray(params) ? params[0] : null;

      if (!point) {
        return "";
      }

      const label = labels[point.dataIndex] || `Point ${point.dataIndex + 1}`;
      const formattedValue =
        typeof tooltipValueFormatter === "function"
          ? tooltipValueFormatter(point.value, point.dataIndex)
          : point.value;

      return `${label}<br/>${tooltipValueLabel || metricLabel}: ${formattedValue}`;
    },
  },
  grid: {
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
  },
  xAxis: {
    type: "category",
    boundaryGap: false,
    show: false,
    data: labels.length === data.length ? labels : data.map((_, index) => index + 1),
  },
  yAxis: {
    type: "value",
    show: false,
  },
  series: [
    {
      data,
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: {
        color,
        width: 2,
      },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: `${color}44` },
            { offset: 1, color: `${color}08` },
          ],
        },
      },
    },
  ],
});

export default function OverviewMetricGrid({
  metrics = [],
  isLoading = false,
  columns = {
    xs: "repeat(2, minmax(0, 1fr))",
    lg: "repeat(4, minmax(0, 1fr))",
  },
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: columns,
        gap: 1.5,
      }}
    >
      {metrics.map((metric) => (
        <Sheet
          key={metric.label}
          variant="outlined"
          sx={{
            borderRadius: "18px",
            borderColor: "rgba(220, 226, 244, 0.95)",
            backgroundColor: "#fff",
            boxShadow: "0 18px 38px rgba(170, 180, 214, 0.1)",
            p: 2.1,
            minHeight: 148,
            overflow: "hidden",
          }}
        >
          <Stack spacing={0.75} sx={{ height: "100%" }}>
            <Typography level="body-sm" sx={{ color: "#60708e", fontWeight: 600 }}>
              {metric.label}
            </Typography>
            <Typography
              level="h2"
              sx={{
                fontWeight: 800,
                color: "var(--color-font-primary)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {isLoading ? "..." : metric.value}
            </Typography>
            <Box sx={{ height: 40, mt: 0.25 }}>
              <ReactECharts
                option={buildKpiSparklineOption(
                  metric.chartData || [0, 0, 0, 0, 0],
                  metric.color,
                  metric.label,
                  metric.chartLabels,
                  metric.tooltipValueFormatter,
                  metric.tooltipValueLabel
                )}
                notMerge
                lazyUpdate
                style={{ height: "40px", width: "100%" }}
              />
            </Box>
            <Typography level="body-sm" sx={{ color: "#5c6d90", lineHeight: 1.6 }}>
              {metric.helper}
            </Typography>
          </Stack>
        </Sheet>
      ))}
    </Box>
  );
}
