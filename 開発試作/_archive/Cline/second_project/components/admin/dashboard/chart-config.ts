interface ChartMargin {
  top: number;
  right: number;
  left: number;
  bottom: number;
}

export const chartConfig = {
  margin: { top: 10, right: 30, left: 0, bottom: 0 } as ChartMargin,
  xAxis: {
    height: 60,
    tick: { fontSize: 12 },
    padding: { left: 0, right: 0 },
    allowDecimals: false,
    allowDataOverflow: false,
  },
  yAxis: {
    width: 80,
    tick: { fontSize: 12 },
    padding: { top: 20, bottom: 20 },
    allowDecimals: false,
    allowDataOverflow: false,
  },
  tooltip: {
    labelStyle: { fontSize: 12 },
    contentStyle: { 
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      padding: '8px 12px',
    },
  },
  line: {
    type: "monotone" as const,
    strokeWidth: 2,
    dot: { strokeWidth: 2 },
    activeDot: { r: 6, strokeWidth: 2 },
  },
} as const;