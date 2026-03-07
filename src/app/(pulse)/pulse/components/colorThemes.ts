/**
 * Color Theme Configuration for Pulse Heat Treemap
 *
 * Each theme defines color families for different categories.
 * Colors are organized from light to dark (falling to rising delta).
 */

export type ColorFamilies = {
  red: string[];
  blue: string[];
  green: string[];
  teal: string[];
  flesh: string[];
};

export type ColorTheme = {
  name: string;
  description: string;
  families: ColorFamilies;
  darkModeFamilies?: ColorFamilies; // Optional dark mode colors
};

/**
 * 古巴比伦色卡 (Ancient Babylon Color Palette)
 *
 * A rich, earthy color palette inspired by ancient civilizations.
 * Features warm reds, deep blues, natural greens, and distinctive teal tones.
 *
 * Characteristics:
 * - Red: Warm terracotta to deep brick (9 colors)
 * - Blue: Sky to midnight blue (10 colors)
 * - Green: Olive to forest green (5 colors)
 * - Teal: Aqua to deep ocean (12 colors)
 * - Flesh: Peachy coral tones (7 colors)
 */
export const ANCIENT_BABYLON_THEME: ColorTheme = {
  name: "古巴比伦色卡",
  description: "Warm earthy tones inspired by ancient Babylon - rich reds, deep blues, and distinctive teals",
  families: {
    // Red family: 9 colors from lightest to darkest
    red: [
      '#fe874f', '#fd8f54', '#f88147', '#f3844c', '#ec783d',
      '#cc553f', '#d5553c', '#af2e29', '#b12b2a'
    ],
    // Blue family: 10 colors from lightest to darkest
    blue: [
      '#8cabe0', '#7a9ad8', '#6889d0', '#6684c4', '#6177b3',
      '#5a73b6', '#5774b6', '#4a6bae', '#3d5c9a', '#304d86'
    ],
    // Green family: 5 colors from lightest to darkest
    green: [
      '#a3ca8b', '#a2c686', '#87a164', '#859c64', '#7f9b61'
    ],
    // Teal family: 12 colors from lightest to darkest
    teal: [
      '#b0dfc8', '#9ed4ba', '#88c4aa', '#7dac98', '#7ba796', '#76aa94',
      '#669084', '#608a7e', '#5e8c7f', '#609084', '#4d766a', '#3d6358'
    ],
    // Flesh family: 7 colors with pink/peachy tones
    flesh: [
      '#fcc9a8', '#fbb896', '#faa784', '#f99672', '#f88560', '#f7744e', '#f6633c'
    ],
  },
};

/**
 * Atypica System Theme - Apple Style
 *
 * Uses Apple's official system gray colors with modern presentation.
 *
 * Light mode: Apple System Gray palette
 * - Official Apple grays from iOS/macOS design system
 * - RGB values directly from Apple Human Interface Guidelines
 * - Clean, neutral, professional - modern frosted glass aesthetic
 *
 * Dark mode: Apple-style vibrant green
 * - Apple system green: #30d158 (bright, vivid)
 * - Gradient from dark green to bright green
 * - High contrast, eye-friendly
 *
 * All color families use the same gradient for consistency.
 */
export const ATYPICA_SYSTEM_THEME: ColorTheme = {
  name: "Atypica 系统色卡",
  description: "Apple system colors - official gray palette (light) / bright green (dark)",
  families: {
    // Light mode: Apple System Gray with better contrast
    // Removed in-between grays to avoid "black & white film" look
    // Larger steps between light and dark for clearer distinction
    red: [
      '#ffffff', '#f2f2f7', '#e5e5ea', '#d1d1d6',
      '#aeaeb2', '#8e8e93', '#636366', '#48484a',
      '#3a3a3c', '#2c2c2e', '#1c1c1e', '#000000',
    ],
    blue: [
      '#ffffff', '#f2f2f7', '#e5e5ea', '#d1d1d6',
      '#aeaeb2', '#8e8e93', '#636366', '#48484a',
      '#3a3a3c', '#2c2c2e', '#1c1c1e', '#000000',
    ],
    green: [
      '#ffffff', '#f2f2f7', '#e5e5ea', '#d1d1d6',
      '#aeaeb2', '#8e8e93', '#636366', '#48484a',
      '#3a3a3c', '#2c2c2e', '#1c1c1e', '#000000',
    ],
    teal: [
      '#ffffff', '#f2f2f7', '#e5e5ea', '#d1d1d6',
      '#aeaeb2', '#8e8e93', '#636366', '#48484a',
      '#3a3a3c', '#2c2c2e', '#1c1c1e', '#000000',
    ],
    flesh: [
      '#ffffff', '#f2f2f7', '#e5e5ea', '#d1d1d6',
      '#aeaeb2', '#8e8e93', '#636366', '#48484a',
      '#3a3a3c', '#2c2c2e', '#1c1c1e', '#000000',
    ],
  },
  // Dark mode: Pure grayscale, no gradient, no green
  darkModeFamilies: {
    red: [
      '#000000', '#1c1c1e', '#2c2c2e', '#3a3a3c',
      '#48484a', '#636366', '#8e8e93', '#aeaeb2',
      '#c7c7cc', '#d1d1d6', '#e5e5ea', '#f2f2f7',
    ],
    blue: [
      '#000000', '#1c1c1e', '#2c2c2e', '#3a3a3c',
      '#48484a', '#636366', '#8e8e93', '#aeaeb2',
      '#c7c7cc', '#d1d1d6', '#e5e5ea', '#f2f2f7',
    ],
    green: [
      '#000000', '#1c1c1e', '#2c2c2e', '#3a3a3c',
      '#48484a', '#636366', '#8e8e93', '#aeaeb2',
      '#c7c7cc', '#d1d1d6', '#e5e5ea', '#f2f2f7',
    ],
    teal: [
      '#000000', '#1c1c1e', '#2c2c2e', '#3a3a3c',
      '#48484a', '#636366', '#8e8e93', '#aeaeb2',
      '#c7c7cc', '#d1d1d6', '#e5e5ea', '#f2f2f7',
    ],
    flesh: [
      '#000000', '#1c1c1e', '#2c2c2e', '#3a3a3c',
      '#48484a', '#636366', '#8e8e93', '#aeaeb2',
      '#c7c7cc', '#d1d1d6', '#e5e5ea', '#f2f2f7',
    ],
  },
};

/**
 * Default Color Theme (for reference/fallback)
 *
 * A modern, vibrant color palette with high contrast.
 */
export const DEFAULT_THEME: ColorTheme = {
  name: "默认色卡",
  description: "Modern vibrant colors with high contrast",
  families: {
    red: ['#ff8a80', '#ff5252', '#ff1744', '#d50000'],
    blue: ['#82b1ff', '#448aff', '#2979ff', '#2962ff'],
    green: ['#b9f6ca', '#69f0ae', '#00e676', '#00c853'],
    teal: ['#84ffff', '#18ffff', '#00e5ff', '#00b8d4'],
    flesh: ['#ffccbc', '#ff8a65', '#ff7043', '#ff5722'],
  },
};

/**
 * Available color themes
 */
export const COLOR_THEMES = {
  atypicaSystem: ATYPICA_SYSTEM_THEME,
  ancientBabylon: ANCIENT_BABYLON_THEME,
  default: DEFAULT_THEME,
} as const;

/**
 * Get color families for a specific theme
 * @param themeName - The theme to use
 * @param isDark - Whether to use dark mode colors (if available)
 */
export function getColorTheme(
  themeName: keyof typeof COLOR_THEMES = 'atypicaSystem',
  isDark: boolean = false
): ColorFamilies {
  const theme = COLOR_THEMES[themeName];

  // Use dark mode colors if available and requested
  if (isDark && theme.darkModeFamilies) {
    return theme.darkModeFamilies;
  }

  return theme.families;
}

/**
 * List all available themes
 */
export function listColorThemes(): ColorTheme[] {
  return Object.values(COLOR_THEMES);
}
