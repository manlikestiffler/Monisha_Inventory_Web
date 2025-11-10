/**
 * Chart Colors Utility
 * Provides theme-aware colors for chart libraries
 */

/**
 * Get computed CSS variable value from document root
 * @param {string} variableName - CSS variable name (with or without --)
 * @returns {string} The HSL value
 */
function getCSSVariable(variableName) {
  const varName = variableName.startsWith('--') ? variableName : `--${variableName}`;
  const root = getComputedStyle(document.documentElement);
  return root.getPropertyValue(varName).trim();
}

/**
 * Convert HSL variable to full HSL string
 * @param {string} variableName - CSS variable name
 * @returns {string} Full HSL color string
 */
export function getHSLColor(variableName) {
  const hslValue = getCSSVariable(variableName);
  return `hsl(${hslValue})`;
}

/**
 * Get chart color palette based on current theme
 * @returns {Object} Chart color configuration
 */
export function getChartColors() {
  return {
    primary: getHSLColor('chart-1'),
    secondary: getHSLColor('chart-2'),
    tertiary: getHSLColor('chart-3'),
    quaternary: getHSLColor('chart-4'),
    quinary: getHSLColor('chart-5'),
    success: getHSLColor('chart-2'), // Green
    warning: getHSLColor('chart-3'), // Orange/Yellow
    danger: getHSLColor('destructive'),
    info: getHSLColor('chart-1'), // Blue
  };
}

/**
 * Get grid and axis colors for charts
 * @returns {Object} Grid and text colors
 */
export function getChartGridColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  
  return {
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : getHSLColor('border'),
    text: getHSLColor('muted-foreground'),
    background: getHSLColor('card'),
  };
}

/**
 * Get tooltip styling for charts
 * @returns {Object} Tooltip style configuration
 */
export function getChartTooltipStyle() {
  return {
    backgroundColor: getHSLColor('card'),
    border: `1px solid ${getHSLColor('border')}`,
    borderRadius: '8px',
    color: getHSLColor('card-foreground'),
  };
}

/**
 * Common chart configuration for Recharts
 * @returns {Object} Common props for Recharts components
 */
export function getCommonChartProps() {
  const colors = getChartColors();
  const gridColors = getChartGridColors();
  const tooltipStyle = getChartTooltipStyle();

  return {
    cartesianGrid: {
      strokeDasharray: '3 3',
      stroke: gridColors.grid,
    },
    xAxis: {
      stroke: gridColors.text,
    },
    yAxis: {
      stroke: gridColors.text,
    },
    tooltip: {
      contentStyle: tooltipStyle,
    },
    colors,
  };
}

/**
 * Get array of chart colors for multi-series charts
 * @param {number} count - Number of colors needed
 * @returns {string[]} Array of HSL color strings
 */
export function getChartColorArray(count = 5) {
  const colors = getChartColors();
  const colorArray = [
    colors.primary,
    colors.secondary,
    colors.tertiary,
    colors.quaternary,
    colors.quinary,
  ];

  return colorArray.slice(0, count);
}
