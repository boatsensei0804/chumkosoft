"use client";

import { createTheme } from "@mui/material/styles";

/*
  MUI theme for chumkosoft.

  Component styles reference the CSS custom properties defined in app/globals.css
  (var(--token)) rather than literal colors, so MUI and Tailwind share one source
  of truth and MUI never runs color math on our OKLCH values (which it can't parse).
  The palette below carries only the minimum MUI needs internally.
*/

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: "#2f57d9", contrastText: "#fbfcff" },
    background: { default: "#ffffff", paper: "#ffffff" },
    text: { primary: "#22262f", secondary: "#5c6675" },
    divider: "#dfe4ee",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    button: { fontWeight: 600, textTransform: "none", letterSpacing: 0 },
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.015em" },
    h3: { fontWeight: 650, letterSpacing: "-0.01em" },
    subtitle2: { fontWeight: 600 },
  },
  components: {
    MuiButtonBase: { defaultProps: { disableRipple: false } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 16,
          paddingBlock: 8,
          transition: "background-color 160ms ease, color 160ms ease, border-color 160ms ease",
        },
        contained: {
          backgroundImage:
            "linear-gradient(180deg, var(--primary-grad-from) 0%, var(--primary-grad-to) 100%)",
          backgroundColor: "var(--primary)",
          color: "var(--on-primary)",
          boxShadow: "0 1px 2px oklch(0.42 0.15 254 / 0.35)",
          "&:hover": {
            backgroundImage:
              "linear-gradient(180deg, var(--primary-hover) 0%, var(--primary-grad-to) 100%)",
          },
        },
        outlined: {
          borderColor: "var(--line-strong)",
          color: "var(--ink)",
          "&:hover": {
            borderColor: "var(--ink)",
            backgroundColor: "var(--surface-2)",
          },
        },
        text: {
          color: "var(--ink)",
          "&:hover": { backgroundColor: "var(--surface-2)" },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: "var(--muted)",
          borderRadius: 10,
          "&:hover": { backgroundColor: "var(--surface-2)", color: "var(--ink)" },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          color: "var(--ink)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "var(--ink-strong)",
          color: "var(--on-primary)",
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 8,
          padding: "6px 10px",
        },
        arrow: { color: "var(--ink-strong)" },
      },
    },
    MuiTable: {
      // Denser default: staff tables carry many rows, so trade whitespace for
      // rows-per-screen. Cell padding below is tuned to stay comfortable with the
      // 36px avatars used in the browsers.
      defaultProps: { size: "small" },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "var(--line)",
          fontSize: 14,
          padding: "9px 16px",
        },
        head: {
          color: "var(--muted)",
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          backgroundColor: "var(--surface-2)",
          paddingBlock: 8,
        },
        paddingCheckbox: { paddingInline: "0 0", width: 44 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, backgroundColor: "var(--surface-sunken)" },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "var(--line)" } },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: 14 },
      },
    },
  },
});

export default theme;
