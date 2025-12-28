import { useMemo } from 'react';
import { useTheme } from 'next-themes';

export function useChartConfig() {
  const { theme } = useTheme();
  
  return useMemo(() => ({
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
    xAxis: {
      tick: { 
        fill: theme === 'dark' ? 'hsl(var(--foreground))' : undefined,
      },
      padding: { left: 0, right: 0 },
      allowDecimals: false,
      allowDataOverflow: false,
      stroke: 'hsl(var(--border))',
    },
    yAxis: {
      tick: { 
        fill: theme === 'dark' ? 'hsl(var(--foreground))' : undefined,
      },
      padding: { top: 20, bottom: 20 },
      allowDecimals: false,
      allowDataOverflow: false,
      stroke: 'hsl(var(--border))',
    },
    cartesianGrid: {
      strokeDasharray: '3 3',
      stroke: 'hsl(var(--border))',
    },
    tooltip: {
      contentStyle: { 
        backgroundColor: theme === 'dark' ? 'hsl(var(--background))' : '#fff',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        padding: '8px 12px',
        color: theme === 'dark' ? 'hsl(var(--foreground))' : undefined,
      },
    },
    line: {
      type: "monotone" as const,
      strokeWidth: 2,
      dot: { 
        strokeWidth: 2,
        fill: theme === 'dark' ? 'hsl(var(--background))' : '#fff',
      },
      activeDot: { 
        r: 6, 
        strokeWidth: 2,
        fill: theme === 'dark' ? 'hsl(var(--background))' : '#fff',
      },
    },
  }), [theme]);
}