/**
 * Treemap visualization constants
 * Centralized configuration for layout, sizing, and styling
 */

// Canvas dimensions - base size for calculations
export const TREEMAP_BASE_WIDTH = 1500;
export const TREEMAP_BASE_HEIGHT = 840;
export const TREEMAP_ASPECT_RATIO = TREEMAP_BASE_WIDTH / TREEMAP_BASE_HEIGHT;

// Tooltip configuration
export const TOOLTIP_WIDTH = 320;
export const TOOLTIP_CURSOR_OFFSET = 14;
export const TOOLTIP_VIEWPORT_PADDING = 8;

// Layout gaps
export const CATEGORY_GAP_PX = 10;
export const PULSE_GAP_PX = 2;
export const CLIP_PADDING_PX = 2;

// Contrast adjustment for visual hierarchy
/** Controls visual contrast for category box sizes (1.0 = linear, higher = more contrast) */
export const CATEGORY_SIZE_CONTRAST_EXPONENT = 1.0;

/** Controls visual contrast for pulse box sizes within categories (higher = bigger difference between large/small pulses) */
export const PULSE_SIZE_CONTRAST_EXPONENT = 5.0;

/** Maximum aspect ratio for tiles (smaller = more square, better text readability) */
export const MAX_TILE_ASPECT_RATIO = 1.0;

// Content display limits
export const DISPLAY_PULSES_PER_CATEGORY = 8;
export const CATEGORY_WEIGHT_SCALE = 1000;

// Typography
/** Maximum font size for pulse titles */
export const TITLE_FONT_MAX = 36;

/** Maximum font size for heat delta display */
export const HEAT_DELTA_FONT_MAX = 32;

/** Minimum font size before giving up on text fitting */
export const MIN_FONT_SIZE = 4;

/** Maximum number of title lines to attempt */
export const MAX_TITLE_LINES = 3;

/** Font weight for pulse titles */
export const TITLE_FONT_WEIGHT = 700;

/** Font family for canvas text measurements (must match actual rendered font) */
export const TEXT_FONT_FAMILY_FOR_MEASUREMENT = "EuclidCircularA, Arial, Helvetica, sans-serif";

// Text layout ratios
/** Ratio of tile height allocated to text block (0.52 = 52% of tile height for text area) */
export const TEXT_BLOCK_HEIGHT_RATIO = 0.52;

/** Safety margin multiplier to prevent text overflow (0.95 = use 95% of available space) */
export const TEXT_OVERFLOW_SAFETY_MARGIN = 0.95;

/** Baseline position multiplier for heat score (0.7 accounts for text extending below baseline) */
export const HEAT_BASELINE_POSITION = 0.7;

/** Line height extra space for descenders (0.3 = 30% extra) */
export const TEXT_DESCENDER_SPACE = 0.3;

// Layout calculations
/** Category header height in pixels */
export const CATEGORY_HEADER_HEIGHT = 20;

// Font sizing heuristics
/** Character width estimation ratio when canvas context unavailable (0.58 = 58% of font size) */
export const CHAR_WIDTH_ESTIMATION_RATIO = 0.58;

/** Starting font size search range as fraction of content height */
export const FONT_SIZE_START_RATIO = 0.18;

/** Minimum font size as fraction of content height */
export const FONT_SIZE_MIN_RATIO = 0.25;

/** Heat score font size as fraction of title font size */
export const HEAT_FONT_SIZE_RATIO = 0.6;

/** Gap between title and heat score as fraction of font size */
export const TITLE_HEAT_GAP_RATIO = 0.15;

// Padding calculations
/** Base padding multiplier for small tiles */
export const PADDING_BASE_MULTIPLIER = 0.06;

/** Additional padding per extra line of text */
export const PADDING_PER_LINE = 0.08;

/** Maximum padding cap in pixels */
export const PADDING_MAX = 12;

/** Minimum padding in pixels */
export const PADDING_MIN = 3;

/** Adaptive gap minimum in pixels */
export const ADAPTIVE_GAP_MIN = 10;

// Animation
/** Zoom transition duration in milliseconds */
export const ZOOM_TRANSITION_DURATION_MS = 300;

// Theme colors
export const THEME_COLORS = {
  gapColor: "#000000", // Pure black gap background
  light: {
    categoryHeader: "#2d3039", // Dark blue-gray
    categoryLabel: "#f8f8f8", // Light text
    pulseBg: "#ffffff", // White background
    pulseText: "#000000", // Black text
  },
  dark: {
    categoryHeader: "#000000", // Black header
    categoryLabel: "#f8f8f8", // Light text
    pulseBg: "#2c2c2e", // Dark gray background
    pulseText: "#ffffff", // White text
  },
} as const;

// Color lightening (precomputed for performance)
export const LIGHTENED_COLORS = {
  light: {
    lighten8: "#f5f5f5", // lightenColor("#ffffff", 0.08)
    lighten3: "#fafafa", // lightenColor("#ffffff", 0.03)
  },
  dark: {
    // Dark theme uses solid colors, no lightening
    lighten8: "#2c2c2e",
    lighten3: "#2c2c2e",
  },
} as const;

// SVG filters
export const MAP_TEXT_SHADOW_FILTER_ID = "map-text-shadow";

// Gap calculation
/** Epsilon value for gap inset calculations to prevent rendering artifacts */
export const GAP_INSET_EPSILON = 0.01;

/** Gap reduction factor (quarter of specified gap to prevent excessive spacing) */
export const GAP_REDUCTION_FACTOR = 0.25;
