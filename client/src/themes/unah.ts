import { theme, type ThemeConfig } from "antd";

export const darkUnahTheme: ThemeConfig = {
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

export const lightUnahTheme: ThemeConfig = {
  token: {
    colorPrimary: "#1e3976",

    colorBgBase: "#ffffff",
    colorBgLayout: "#f6f8fb",
    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",
    colorBgSpotlight: "#f0f4fb",

    colorTextBase: "#0f1724",
    colorText: "#0f1724",
    colorTextSecondary: "#475569",
    colorTextTertiary: "#6b7280",
    colorTextQuaternary: "#9aa0ab",

    colorBorder: "#e6eef6",
    colorBorderSecondary: "#e6eef6",
    colorSplit: "#e6eef6",

    colorSuccess: "#237a4b",
    colorWarning: "#b77900",
    colorError: "#a61e2b",
    colorInfo: "#0b7285",
    colorLink: "#1e3976",

    borderRadius: 8,
    fontSize: 15,
    controlHeight: 40,
    wireframe: false,

    fontFamily:
      "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",

    boxShadow: "0 6px 18px rgba(16,24,40,0.08)",
    boxShadowSecondary: "0 4px 12px rgba(16,24,40,0.06)",
    boxShadowTertiary: "0 2px 6px rgba(16,24,40,0.04)",
  },

  components: {
    Layout: {
      bodyBg: "#f6f8fb",
      headerBg: "#1e3976",
      siderBg: "#1e3976",
      triggerBg: "#1e3976",
      triggerColor: "#0f1724",
      footerBg: "#ffffff",
      headerColor: "#1e3976",
      lightSiderBg: "#ffffff",
      lightTriggerBg: "#ffffff",
      lightTriggerColor: "#0f1724",
    },

    Menu: {
      itemBg: "#2b287700",
      subMenuItemBg: "#2b2877",
      popupBg: "#ffffff",

      itemColor: "#ffffff",
      itemHoverColor: "#0f1724",
      itemHoverBg: "#f0f4fb",

      itemSelectedBg: "#2e5f9a",
      itemSelectedColor: "#ffffff",
      groupTitleColor: "#6b7280",
      subMenuItemSelectedColor: "#1e3976",

      itemBorderRadius: 8,
      subMenuItemBorderRadius: 8,
      itemHeight: 42,
      itemMarginBlock: 4,
      itemMarginInline: 6,
      itemPaddingInline: 14,

      dangerItemActiveBg: "#ffecec",
      dangerItemColor: "#a61e2b",
      dangerItemSelectedBg: "#a61e2b",
      dangerItemSelectedColor: "#ffffff",
      dangerItemHoverColor: "#a61e2b",

      activeBarHeight: 3,
      activeBarBorderWidth: 0,
      horizontalItemSelectedColor: "#1e3976",
      horizontalItemHoverColor: "#0f1724",
    },

    Button: {
      borderRadius: 8,
      controlHeight: 40,
      fontWeight: 600,
      primaryShadow: "0 4px 10px rgba(30,57,118,0.08)",
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
      activeBg: "#ffffff",
      hoverBg: "#ffffff",
      addonBg: "#f6f8fb",
      activeBorderColor: "#1e3976",
      hoverBorderColor: "#3f5d9c",
      activeShadow: "0 0 0 4px rgba(30,57,118,0.06)",
      colorBgContainer: "#ffffff",
    },

    InputNumber: {
      activeBg: "#ffffff",
      hoverBg: "#ffffff",
      addonBg: "#f6f8fb",
      activeBorderColor: "#1e3976",
      hoverBorderColor: "#3f5d9c",
      activeShadow: "0 0 0 4px rgba(30,57,118,0.06)",
    },

    Select: {
      selectorBg: "#ffffff",
      optionSelectedBg: "#1e3976",
      optionActiveBg: "#f0f4fb",
      optionSelectedColor: "#ffffff",
      activeBorderColor: "#1e3976",
      hoverBorderColor: "#3f5d9c",
      activeOutlineColor: "rgba(30,57,118,0.06)",
      clearBg: "#ffffff",
    },

    Dropdown: {
      colorBgElevated: "#ffffff",
      controlItemBgHover: "#f0f4fb",
    },

    Card: {
      colorBgContainer: "#ffffff",
      colorBorderSecondary: "#e6eef6",
      headerBg: "#ffffff",
      headerFontSize: 16,
      borderRadiusLG: 12,
    },

    Table: {
      headerBg: "#f6f8fb",
      headerColor: "#0f1724",
      rowHoverBg: "#f0f4fb",
      colorBgContainer: "#ffffff",
      borderColor: "#e6eef6",
      footerBg: "#ffffff",
      headerSplitColor: "#e6eef6",
    },

    Modal: {
      contentBg: "#ffffff",
      headerBg: "#ffffff",
      footerBg: "#ffffff",
      titleColor: "#0f1724",
      titleFontSize: 18,
    },

    Drawer: {
      colorBgElevated: "#ffffff",
      footerPaddingBlock: 12,
      footerPaddingInline: 16,
    },

    Tabs: {
      itemColor: "#475569",
      itemHoverColor: "#0f1724",
      itemSelectedColor: "#1e3976",
      inkBarColor: "#1e3976",
      cardBg: "#ffffff",
      cardHeight: 40,
    },

    Breadcrumb: {
      itemColor: "#6b7280",
      lastItemColor: "#0f1724",
      linkColor: "#475569",
      linkHoverColor: "#0f1724",
      separatorColor: "#d1d9e6",
    },

    Pagination: {
      itemBg: "#ffffff",
      itemActiveBg: "#1e3976",
      itemLinkBg: "#ffffff",
      itemInputBg: "#ffffff",
      colorText: "#0f1724",
      colorTextDisabled: "#9aa0ab",
      colorPrimary: "#ffffff",
    },

    Tooltip: {
      colorBgSpotlight: "#0f1724",
      colorTextLightSolid: "#ffffff",
      borderRadius: 8,
    },

    Popover: {
      titleMinWidth: 160,
      colorBgElevated: "#ffffff",
    },

    Descriptions: {
      labelBg: "#ffffff",
      titleColor: "#0f1724",
    },

    Collapse: {
      headerBg: "#ffffff",
      contentBg: "#ffffff",
      borderlessContentBg: "#ffffff",
    },

    Segmented: {
      trackBg: "#f6f8fb",
      itemSelectedBg: "#1e3976",
      itemSelectedColor: "#ffffff",
      itemHoverBg: "#f0f4fb",
    },

    Radio: {
      buttonCheckedBg: "#1e3976",
      buttonCheckedBgDisabled: "#f1f5f9",
      buttonCheckedColorDisabled: "#9aa0ab",
      buttonColor: "#475569",
      buttonSolidCheckedColor: "#ffffff",
      buttonSolidCheckedActiveBg: "#162c5d",
      buttonSolidCheckedHoverBg: "#274892",
    },

    Checkbox: {
      colorPrimary: "#1e3976",
      colorPrimaryHover: "#274892",
      colorBorder: "#d1d9e6",
    },

    Switch: {
      colorPrimary: "#1e3976",
      colorPrimaryHover: "#274892",
      colorTextQuaternary: "#9aa0ab",
      trackHeight: 24,
      trackMinWidth: 46,
    },

    Tag: {
      defaultBg: "#f6f8fb",
      defaultColor: "#475569",
      colorBorder: "#e6eef6",
    },

    Alert: {
      withDescriptionIconSize: 22,
      colorSuccessBg: "rgba(35, 122, 75, 0.12)",
      colorSuccessBorder: "#237a4b",
      colorWarningBg: "rgba(183, 121, 0, 0.08)",
      colorWarningBorder: "#b77900",
      colorErrorBg: "rgba(166, 30, 43, 0.08)",
      colorErrorBorder: "#a61e2b",
      colorInfoBg: "rgba(11, 114, 133, 0.08)",
      colorInfoBorder: "#0b7285",
    },

    Notification: {
      colorBgElevated: "#ffffff",
    },

    Message: {
      contentBg: "#ffffff",
    },

    Divider: {
      colorSplit: "#e6eef6",
    },

    Skeleton: {
      gradientFromColor: "rgba(16,24,40,0.04)",
      gradientToColor: "rgba(16,24,40,0.08)",
      blockRadius: 8,
    },
  },
};