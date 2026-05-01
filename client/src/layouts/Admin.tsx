import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import {
  FaBars,
  FaFile,
  FaTerminal,
  FaUserShield,
  FaUsers,
  FaCompressArrowsAlt,
  FaPaperPlane,
  FaRecycle,
  FaMicrophone,
  FaChartArea,
  FaDatabase,
  FaFileImport,
  FaCog,
  FaServer,
  FaRegArrowAltCircleLeft,
} from "react-icons/fa";
import { FaBots, FaMessage } from "react-icons/fa6"

import {
  ConfigProvider,
  Drawer,
  Layout,
  Menu,
  MenuProps,
  Spin,
  theme,
} from "antd";
import esES from "antd/locale/es_ES";

import { useDispatch, useSelector } from "react-redux";

import { useTranslation } from "react-i18next";
import AuthFeature from "../features/auth/";

import ConfigFeature from "../features/config/";
import type { RootState } from "../store";

import { hasPermissions } from "../utils/permissions";

const { Header, Sider, Content, Footer } = Layout;

interface LayoutProps {
  children: React.ReactNode;
  selectedPage?: string;
}

export default function PageLayout({ children, selectedPage }: LayoutProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch<typeof import("../store").store.dispatch>();

  const { t } = useTranslation(["layouts"], { keyPrefix: "admin" });

  const { account } = useSelector((state: RootState) => state.auth);
  const { config } = useSelector((state: RootState) => state.config);
  const { preferences: userPreferences } = useSelector(
    (state: RootState) => state.preferences,
  );

  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    if (!account) {
      (async () => {
        const result = await dispatch(AuthFeature.actions.fetch());

        if (
          AuthFeature.actions.fetch.rejected.match(result) ||
          result.payload.status === "unauthenticated"
        ) {
          navigate({ to: "/auth/login" });
        }
      })();
    }
  }, [account]);

  useEffect(() => {
    if (!config) dispatch(ConfigFeature.actions.fetchConfig());

    // if (!config?.masterServer.enabled) navigate({ to: '/nodes/register' })
  }, [config]);

  const sidebarRef = useRef(null);


  type MenuItem = Required<MenuProps>["items"][number];
  const menuItems = useMemo<MenuItem[]>(() => {
    if (!account) return [];

    const userPermissions = account.data.role.permissions;

    return [
      // === Overview & Core ===
      {
        key: "dashboard",
        label: <Link to="/admin">{t("sidebar.dashboard")}</Link>,
        icon: <FaCompressArrowsAlt />, // Better for dashboards
      },

      {
        key: "chats-group",
        label: t("sidebar.chats-group.title"),
        icon: <FaPaperPlane />,
        children: [
          {
            key: "text-chat",
            label: <Link to="/chat">{t("sidebar.chats-group.text")}</Link>,
            icon: <FaMessage />,
          },
          {
            key: "voice-chat",
            label: <Link to="/voice-chat">{t("sidebar.chats-group.voice")}</Link>,
            icon: <FaMicrophone />,
          },
        ],
      },

      {
        key: "reports-group",
        label: t("sidebar.reports.title"),
        icon: <FaChartArea />,
        children: [
          // Nothing in this section
          {
            key: "placeholder",
            label: (
              <span className="text-gray-500 italic">
                {t("sidebar.reports.no-reports")}
              </span>
            ),
          },
        ],
      },

      {
        key: "system-data-group",
        label: t("sidebar.data.title"),
        icon: <FaDatabase />,
        children: [
          {
            key: "rag-documents",
            label: (
              <Link to="/admin/rag-documents">{t("sidebar.data.rag")}</Link>
            ),
            icon: <FaFile />,
          },

          {
            key: "mcp-servers",
            label: (
              <Link to="/admin/rag-documents">{t("sidebar.data.mcp-servers")}</Link>
            ),
            icon: <FaBots />,
          },

          {
            key: "deterministic-workflows",
            label: (
              <Link to="/admin/rag-documents">{t("sidebar.data.deterministic-workflows")}</Link>
            ),
            icon: <FaRecycle />,
          },
        ],
      },

      {
        key: "import-export-group",
        label: t("sidebar.import-export.title"),
        icon: <FaFileImport />,
        children: [
        ],
      },

      {
        key: "management",
        label: t("sidebar.management.title"),
        icon: <FaCog />,
        children: [
          {
            key: "accounts",
            label: (
              <Link to="/admin/accounts">
                {t("sidebar.management.accounts")}
              </Link>
            ),
            style: {
              display: hasPermissions(userPermissions, ["accounts:read"]) ? "block" : "none",
            },
            icon: <FaUsers />, // Better for dashboards
          },

          {
            key: "account-roles",
            label: (
              <Link to="/admin/accounts/roles">
                {t("sidebar.management.account-roles")}
              </Link>
            ),
            style: {
              display: hasPermissions(userPermissions, ["account-roles:read"]) ? "block" : "none",
            },
            icon: <FaUserShield />,
          },

          {
            key: "config",
            label: (
              <Link to="/admin/config">{t("sidebar.management.config")}</Link>
            ),
            style: {
              display: hasPermissions(userPermissions, ["config:read"]) ? "block" : "none",
            },
            icon: <FaCog />,
          },

          {
            key: "logs",
            label: <Link to="/admin/logs">{t("sidebar.management.logs")}</Link>,
            style: { display: hasPermissions(userPermissions, ["logs:read"]) ? "block" : "none" },
            icon: <FaTerminal />,
          },
        ],
      },

      {
        key: "logout",
        label: (
          <Link color="red" to="/auth/logout">
            {t("sidebar.logout")}
          </Link>
        ),
        danger: true,
        icon: <FaRegArrowAltCircleLeft className="text-red-500" />,
      },
    ];
  }, [account]);

  const darkTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
      // Primary
      colorPrimary: "#1e3976",

      // Backgrounds
      colorBgBase: "#0f1115", // app background (almost black)
      colorBgLayout: "#0f1115",
      colorBgContainer: "#16181d", // cards, sider, header
      colorBgElevated: "#1d2026", // dropdowns, modals, popovers
      colorBgSpotlight: "#262a33", // highlights, selected items

      // Text
      colorTextBase: "#e6e9f0",
      colorTextSecondary: "#b8c1d9",

      // Borders
      colorBorder: "#262a33",
      colorSplit: "#262a33",

      // Status
      colorSuccess: "#366533",
      colorWarning: "#f0b92d",
      colorError: "#8a1518",
      colorInfo: "#5facc5",

      // UI
      borderRadius: 8,
      fontSize: 15,
    },
  };

  const lightTheme = {
    algorithm: theme.defaultAlgorithm,
    token: {
      // Primary
      colorPrimary: "#1e3976",

      // Backgrounds
      colorBgBase: "#ffffff",
      colorBgContainer: "#ffffff",
      colorBgLayout: "#f5f7fb",

      // Text
      colorTextBase: "#1f2937",
      colorTextSecondary: "#4b5563",

      // Borders
      colorBorder: "#e5e7eb",

      // Status
      colorSuccess: "#366533",
      colorWarning: "#f0b92d",
      colorError: "#8a1518",
      colorInfo: "#5facc5",

      // UI
      borderRadius: 8,
      fontSize: 15,
    },
  };

  const isDark = true;

  return (
    <ConfigProvider locale={esES} theme={isDark ? darkTheme : lightTheme}>
      {/* Top Navbar */}
      <Header
        className={`px-4 flex items-center justify-between bg-white dark:bg-neutral-800 ${isDark ? "dark" : ""}`}
        style={{ paddingInline: 16 }}
      >
        <div className="md:hidden block">
          <button
            onClick={() => setDrawerVisible(true)}
            className="md:hidden text-xl block text-white"
          >
            <FaBars />
          </button>
        </div>
        <h1 className="text-lg font-semibold text-black dark:text-white">
          {t("sidebar.title")}
        </h1>
      </Header>

      <Layout hasSider>
        {/* Sidebar for desktop */}
        <Sider
          breakpoint="md"
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          className="hidden md:block"
          theme={isDark ? "dark" : "light"}
          width={220}
          ref={sidebarRef}
        >
          <Menu
            mode="inline"
            defaultOpenKeys={["chats-group", "reports-group", "system-data-group", "import-export-group", "management"]}
            defaultSelectedKeys={[selectedPage || "dashboard"]}
            items={menuItems}
            className="h-full"
          />
        </Sider>

        {/* Sidebar Drawer for mobile */}
        <Drawer
          title="Menú"
          placement="left"
          // This code is responsible for opening and closing the drawer menu in a mobile device. It's controlled by 'setDrawerVisible' function which sets 'drawerVisible' state variable to true or false.
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
        >
          <Menu
            mode="inline"
            defaultSelectedKeys={[selectedPage || "dashboard"]}
            items={menuItems}
            onClick={() => setDrawerVisible(false)}
          />
        </Drawer>

        {/* Main Content */}
        <Layout
          style={{ background: "transparent" }}
          className={`min-h-screen ${isDark ? "dark" : ""}`}
        >
          <div className="p-6 dark:text-white min-h-[calc(100vh-64px)]">
            {account && children}
            {!account && (
              <div className="text-center text-lg text-gray-500">
                <Spin size="large" />
              </div>
            )}
          </div>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
