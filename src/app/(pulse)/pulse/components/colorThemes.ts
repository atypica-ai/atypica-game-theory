/**
 * Treemap 色卡配置
 *
 * 用于 PulseHeatTreemap 的数据可视化着色。
 * 每个 color family 对应一组类别，颜色从浅到深排列（对应 heatDelta 从低到高）。
 *
 * Light mode: Apple System Gray（官方灰度）
 * Dark mode: 反转灰度（暗到亮）
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
  families: ColorFamilies;
  darkModeFamilies?: ColorFamilies;
};

const APPLE_GRAY_LIGHT: string[] = [
  '#ffffff', '#f2f2f7', '#e5e5ea', '#d1d1d6',
  '#aeaeb2', '#8e8e93', '#636366', '#48484a',
  '#3a3a3c', '#2c2c2e', '#1c1c1e', '#000000',
];

const APPLE_GRAY_DARK: string[] = [
  '#000000', '#1c1c1e', '#2c2c2e', '#3a3a3c',
  '#48484a', '#636366', '#8e8e93', '#aeaeb2',
  '#c7c7cc', '#d1d1d6', '#e5e5ea', '#f2f2f7',
];

const THEME: ColorTheme = {
  name: "Atypica System",
  families: {
    red: APPLE_GRAY_LIGHT,
    blue: APPLE_GRAY_LIGHT,
    green: APPLE_GRAY_LIGHT,
    teal: APPLE_GRAY_LIGHT,
    flesh: APPLE_GRAY_LIGHT,
  },
  darkModeFamilies: {
    red: APPLE_GRAY_DARK,
    blue: APPLE_GRAY_DARK,
    green: APPLE_GRAY_DARK,
    teal: APPLE_GRAY_DARK,
    flesh: APPLE_GRAY_DARK,
  },
};

/**
 * 获取当前主题的 color families
 */
export function getColorTheme(
  _themeName: string = 'atypicaSystem',
  isDark: boolean = false
): ColorFamilies {
  if (isDark && THEME.darkModeFamilies) {
    return THEME.darkModeFamilies;
  }
  return THEME.families;
}
