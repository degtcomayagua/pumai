import { theme, type ThemeConfig } from "antd";

export const unahTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#1e3976",

    colorBgBase: "#0f1115",
    colorBgLayout: "#0f1115",
    colorBgContainer: "#16181d",
    colorBgElevated: "#1d2026",
    colorBgSpotlight: "#262a33",

    colorTextBase: "#e6e9f0",
    colorText: "#e6e9f0",
    colorTextSecondary: "#b8c1d9",
    colorTextTertiary: "#8f98ad",
    colorTextQuaternary: "#6f7788",

    colorBorder: "#262a33",
    colorBorderSecondary: "#262a33",
    colorSplit: "#262a33",

    colorSuccess: "#366533",
    colorWarning: "#f0b92d",
    colorError: "#8a1518",
    colorInfo: "#5facc5",
    colorLink: "#5facc5",

    borderRadius: 8,
    fontSize: 15,
    controlHeight: 40,
    wireframe: false,

    fontFamily:
      "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",

    boxShadow: "0 8px 24px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25)",
    boxShadowSecondary:
      "0 6px 18px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.22)",
    boxShadowTertiary: "0 2px 8px rgba(0,0,0,0.22)",
  },

  components: {
    Layout: {
      bodyBg: "#0f1115",
      headerBg: "#16181d",
      siderBg: "#16181d",
      triggerBg: "#16181d",
      triggerColor: "#e6e9f0",
      footerBg: "#0f1115",
      headerColor: "#e6e9f0",
      lightSiderBg: "#16181d",
      lightTriggerBg: "#16181d",
      lightTriggerColor: "#e6e9f0",
    },

    Menu: {
      darkItemBg: "#16181d",
      darkSubMenuItemBg: "#121419",
      darkPopupBg: "#1d2026",

      darkItemColor: "#b8c1d9",
      darkItemHoverColor: "#ffffff",
      darkItemHoverBg: "#262a33",

      darkItemSelectedBg: "#1e3976",
      darkItemSelectedColor: "#ffffff",
      darkGroupTitleColor: "#8f98ad",
      itemSelectedColor: "#5facc5",
      subMenuItemSelectedColor: "#5facc5",

      itemBorderRadius: 8,
      subMenuItemBorderRadius: 8,
      itemHeight: 42,
      itemMarginBlock: 4,
      itemMarginInline: 6,
      itemPaddingInline: 14,

      dangerItemActiveBg: "#e3565a",
      dangerItemColor: "#e3565a",
      dangerItemSelectedBg: "#e3565a",
      dangerItemSelectedColor: "#ffffff",
      dangerItemHoverColor: "#e3565a",

      activeBarHeight: 3,
      activeBarBorderWidth: 0,
      horizontalItemSelectedColor: "#5facc5",
      horizontalItemHoverColor: "#ffffff",
    },

    Button: {
      borderRadius: 8,
      controlHeight: 40,
      fontWeight: 600,
      primaryShadow: "none",
      defaultShadow: "none",
      dangerShadow: "none",
      contentFontSize: 15,
      contentFontSizeLG: 15,
      contentFontSizeSM: 14,
      colorPrimary: "#1e3976",
      colorPrimaryHover: "#274892",
      colorPrimaryActive: "#162c5d",
    },

    Input: {
      activeBg: "#16181d",
      hoverBg: "#16181d",
      addonBg: "#1d2026",
      activeBorderColor: "#5facc5",
      hoverBorderColor: "#3f5d9c",
      activeShadow: "0 0 0 2px rgba(95, 172, 197, 0.18)",
      colorBgContainer: "#16181d",
    },

    InputNumber: {
      activeBg: "#16181d",
      hoverBg: "#16181d",
      addonBg: "#1d2026",
      activeBorderColor: "#5facc5",
      hoverBorderColor: "#3f5d9c",
      activeShadow: "0 0 0 2px rgba(95, 172, 197, 0.18)",
    },

    Select: {
      selectorBg: "#16181d",
      optionSelectedBg: "#1e3976",
      optionActiveBg: "#262a33",
      optionSelectedColor: "#ffffff",
      activeBorderColor: "#5facc5",
      hoverBorderColor: "#3f5d9c",
      activeOutlineColor: "rgba(95, 172, 197, 0.18)",
      clearBg: "#16181d",
    },

    Dropdown: {
      colorBgElevated: "#1d2026",
      controlItemBgHover: "#262a33",
    },

    Card: {
      colorBgContainer: "#16181d",
      colorBorderSecondary: "#262a33",
      headerBg: "#16181d",
      headerFontSize: 16,
      borderRadiusLG: 12,
    },

    Table: {
      headerBg: "#1d2026",
      headerColor: "#e6e9f0",
      rowHoverBg: "#262a33",
      colorBgContainer: "#16181d",
      borderColor: "#262a33",
      footerBg: "#16181d",
      headerSplitColor: "#262a33",
    },

    Modal: {
      contentBg: "#1d2026",
      headerBg: "#1d2026",
      footerBg: "#1d2026",
      titleColor: "#e6e9f0",
      titleFontSize: 18,
    },

    Drawer: {
      colorBgElevated: "#1d2026",
      footerPaddingBlock: 12,
      footerPaddingInline: 16,
    },

    Tabs: {
      itemColor: "#b8c1d9",
      itemHoverColor: "#ffffff",
      itemSelectedColor: "#5facc5",
      inkBarColor: "#5facc5",
      cardBg: "#16181d",
      cardHeight: 40,
    },

    Breadcrumb: {
      itemColor: "#8f98ad",
      lastItemColor: "#e6e9f0",
      linkColor: "#b8c1d9",
      linkHoverColor: "#ffffff",
      separatorColor: "#6f7788",
    },

    Pagination: {
      itemBg: "#16181d",
      itemActiveBg: "#1e3976",
      itemLinkBg: "#16181d",
      itemInputBg: "#16181d",
      colorText: "#e6e9f0",
      colorTextDisabled: "#6f7788",
      colorPrimary: "#ffffff",
    },

    Tooltip: {
      colorBgSpotlight: "#262a33",
      colorTextLightSolid: "#e6e9f0",
      borderRadius: 8,
    },

    Popover: {
      titleMinWidth: 160,
      colorBgElevated: "#1d2026",
    },

    Descriptions: {
      labelBg: "#1d2026",
      titleColor: "#e6e9f0",
    },

    Collapse: {
      headerBg: "#16181d",
      contentBg: "#16181d",
      borderlessContentBg: "#16181d",
    },

    Segmented: {
      trackBg: "#1d2026",
      itemSelectedBg: "#1e3976",
      itemSelectedColor: "#ffffff",
      itemHoverBg: "#262a33",
    },

    Radio: {
      // buttonBg: "#16181d",
      buttonCheckedBg: "#ffffff",
      buttonCheckedBgDisabled: "#2a2f39",
      buttonCheckedColorDisabled: "#8f98ad",
      buttonColor: "#b8c1d9",
      buttonSolidCheckedColor: "#ffffff",
      buttonSolidCheckedActiveBg: "#162c5d",
      buttonSolidCheckedHoverBg: "#274892",
    },

    Checkbox: {
      colorPrimary: "#1e3976",
      colorPrimaryHover: "#274892",
      colorBorder: "#3b4250",
    },

    Switch: {
      colorPrimary: "#1e3976",
      colorPrimaryHover: "#274892",
      colorTextQuaternary: "#6f7788",
      trackHeight: 24,
      trackMinWidth: 46,
    },

    Tag: {
      defaultBg: "#1d2026",
      defaultColor: "#b8c1d9",
      colorBorder: "#262a33",
    },

    Alert: {
      withDescriptionIconSize: 22,
      colorSuccessBg: "rgba(54, 101, 51, 0.18)",
      colorSuccessBorder: "#366533",
      colorWarningBg: "rgba(240, 185, 45, 0.16)",
      colorWarningBorder: "#f0b92d",
      colorErrorBg: "rgba(138, 21, 24, 0.20)",
      colorErrorBorder: "#8a1518",
      colorInfoBg: "rgba(95, 172, 197, 0.16)",
      colorInfoBorder: "#5facc5",
    },

    Notification: {
      colorBgElevated: "#1d2026",
    },

    Message: {
      contentBg: "#1d2026",
    },

    Divider: {
      colorSplit: "#262a33",
    },

    Skeleton: {
      gradientFromColor: "rgba(255,255,255,0.06)",
      gradientToColor: "rgba(255,255,255,0.12)",
      blockRadius: 8,
    },
  },
};