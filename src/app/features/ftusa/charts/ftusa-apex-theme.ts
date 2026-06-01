import type {
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexStates,
  ApexStroke,
  ApexTheme,
  ApexTooltip,
} from 'ng-apexcharts';

export const FTUSA_CHART_COLORS = {
  amber: '#F59E0B',
  deepTeal: '#0F6F73',
  error: '#EF4444',
  grid: '#E5E7EB',
  mint: '#6BE3B2',
  muted: '#64747B',
  primary: '#1FBF9A',
  text: '#102A2D',
};

export function ftusaChartBase(
  type: NonNullable<ApexChart['type']>,
  height: number,
  stacked = false,
): ApexChart {
  return {
    animations: {
      enabled: true,
      speed: 450,
    },
    fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
    foreColor: FTUSA_CHART_COLORS.muted,
    height,
    stacked,
    toolbar: {
      show: false,
    },
    type,
    zoom: {
      enabled: false,
    },
  };
}

export function ftusaGrid(): ApexGrid {
  return {
    borderColor: FTUSA_CHART_COLORS.grid,
    strokeDashArray: 4,
    xaxis: {
      lines: {
        show: false,
      },
    },
  };
}

export function ftusaDataLabels(enabled = false): ApexDataLabels {
  return {
    enabled,
    style: {
      fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
      fontWeight: '700',
    },
  };
}

export function ftusaLegend(position: ApexLegend['position'] = 'top'): ApexLegend {
  return {
    fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
    fontWeight: 700,
    markers: {
      size: 6,
    },
    position,
  };
}

export function ftusaStroke(width = 3, curve: ApexStroke['curve'] = 'smooth'): ApexStroke {
  return {
    curve,
    lineCap: 'round',
    width,
  };
}

export function ftusaAreaFill(opacityFrom = 0.35, opacityTo = 0.04): ApexFill {
  return {
    gradient: {
      opacityFrom,
      opacityTo,
      shadeIntensity: 0.25,
      stops: [0, 90, 100],
    },
    type: 'gradient',
  };
}

export function ftusaTooltip(): ApexTooltip {
  return {
    theme: 'light',
  };
}

export function ftusaStates(): ApexStates {
  return {
    active: {
      filter: {
        type: 'none',
      },
    },
    hover: {
      filter: {
        type: 'lighten',
      },
    },
  };
}

export const ftusaTheme: ApexTheme = {
  mode: 'light',
  monochrome: {
    enabled: false,
  },
};
