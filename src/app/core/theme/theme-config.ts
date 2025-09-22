export interface Theme {
  primary: ColorPalette;
  secondary: ColorPalette;
  success: ColorPalette;
  warning: ColorPalette;
  error: ColorPalette;
  info: ColorPalette;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    hint: string;
  };
  background: {
    default: string;
    paper: string;
  };
  divider: string;
}

export interface ColorPalette {
  main: string;
  light: string;
  dark: string;
  contrastText: string;
}

export const lightTheme: Theme = {
  primary: {
    main: '#4361ee',
    light: '#4895ef',
    dark: '#3f37c9',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#7209b7',
    light: '#9b4dca',
    dark: '#560bad',
    contrastText: '#ffffff',
  },
  success: {
    main: '#4bb543',
    light: '#7ed56f',
    dark: '#28a745',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f9c74f',
    light: '#ffd166',
    dark: '#ffc107',
    contrastText: '#212529',
  },
  error: {
    main: '#ef476f',
    light: '#ff6b6b',
    dark: '#dc3545',
    contrastText: '#ffffff',
  },
  info: {
    main: '#4cc9f0',
    light: '#48cae4',
    dark: '#00b4d8',
    contrastText: '#ffffff',
  },
  text: {
    primary: '#212529',
    secondary: '#495057',
    disabled: '#6c757d',
    hint: '#6c757d',
  },
  background: {
    default: '#f8f9fa',
    paper: '#ffffff',
  },
  divider: 'rgba(0, 0, 0, 0.12)',
};

export const darkTheme: Theme = {
  ...lightTheme,
  primary: {
    ...lightTheme.primary,
    main: '#4cc9f0',
  },
  secondary: {
    ...lightTheme.secondary,
    main: '#9b4dca',
  },
  text: {
    primary: '#f8f9fa',
    secondary: '#e9ecef',
    disabled: '#adb5bd',
    hint: '#adb5bd',
  },
  background: {
    default: '#121212',
    paper: '#1e1e1e',
  },
  divider: 'rgba(255, 255, 255, 0.12)',
};

export const themeConfig = {
  light: lightTheme,
  dark: darkTheme,
};

export type AppTheme = 'light' | 'dark';
