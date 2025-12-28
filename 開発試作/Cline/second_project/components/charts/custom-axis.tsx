import { XAxis as RechartsXAxis, YAxis as RechartsYAxis } from "recharts";
import type { XAxisProps as RechartsXAxisProps, YAxisProps as RechartsYAxisProps } from "recharts";
import { useTheme } from "next-themes";

type AxisTick = {
  fontSize?: number;
  fill?: string;
  [key: string]: any;
};

type CustomXAxisProps = Omit<RechartsXAxisProps, 'height' | 'tick'> & {
  height?: number;
  tick?: AxisTick;
};

type CustomYAxisProps = Omit<RechartsYAxisProps, 'width' | 'tick'> & {
  width?: number;
  tick?: AxisTick;
};

export function XAxis({ 
  height = 60,
  tick,
  padding = { left: 0, right: 0 },
  allowDecimals = false,
  allowDataOverflow = false,
  stroke,
  xAxisId = "0",
  ...props 
}: CustomXAxisProps) {
  const { theme } = useTheme();
  
  return (
    <RechartsXAxis
      height={height}
      tick={{ 
        fontSize: 12,
        fill: theme === "dark" ? "hsl(var(--foreground))" : undefined,
        ...(tick || {})
      }}
      padding={padding}
      allowDecimals={allowDecimals}
      allowDataOverflow={allowDataOverflow}
      stroke={stroke ?? "hsl(var(--border))"}
      xAxisId={xAxisId}
      {...props}
    />
  );
}

export function YAxis({
  width = 80,
  tick,
  padding = { top: 20, bottom: 20 },
  allowDecimals = false,
  allowDataOverflow = false,
  stroke,
  yAxisId = "0",
  ...props
}: CustomYAxisProps) {
  const { theme } = useTheme();

  return (
    <RechartsYAxis
      width={width}
      tick={{
        fontSize: 12,
        fill: theme === "dark" ? "hsl(var(--foreground))" : undefined,
        ...(tick || {})
      }}
      padding={padding}
      allowDecimals={allowDecimals}
      allowDataOverflow={allowDataOverflow}
      stroke={stroke ?? "hsl(var(--border))"}
      yAxisId={yAxisId}
      {...props}
    />
  );
}