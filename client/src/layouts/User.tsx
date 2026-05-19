import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import esES from "antd/locale/es_ES";
import {
  Layout,
  Menu,
  Drawer,
  Button,
  Tag,
  ConfigProvider,
  theme,
  Avatar,
  Space,
  Tooltip,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
const { Header, Sider, Content } = Layout;
import {
  FaBars,
  FaRobot,
  FaQuestionCircle,
  FaCircle,
  FaFolder,
  FaUser,
} from "react-icons/fa";

import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { useTranslation } from "react-i18next";

import PreferencesFeature from "../features/preferences";
import { lightUnahTheme } from "../themes/unah";

interface LayoutProps {
  children: React.ReactNode;
  selectedPage?: string;
}

export default function GeneralLayout({
  children,
  selectedPage = "chat",
}: LayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(["layouts"], {
    keyPrefix: "general",
  });

  // Connection status
  const { status: serverConnectionStatus } = useSelector(
    (state: RootState) => state.status,
  );

  // serverConnectionStatus === "succeeded" means connected
  const isConnected = serverConnectionStatus === "succeeded";

  // Preferences
  const { preferences: userPreferences } = useSelector(
    (state: RootState) => state.preferences,
  );
  const {
    savePreferences,
    state: preferencesModalState,
    setState: setPreferencesModalState,
    openModal: openPreferencesModal,
  } = PreferencesFeature.hooks.usePreferencesModal({
    onSuccess: () => {
      // Reload the page to apply new preferences
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
  });

  // Sidebar / drawer
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "preferences") {
      openPreferencesModal();
      setDrawerVisible(false);
      return;
    }

    // For named routes that map 1:1 to menu keys
    navigate({ to: `/${key}` });
    setDrawerVisible(false);
  };

  const items: MenuProps["items"] = useMemo(
    () => [
      {
        key: "chat",
        icon: <FaRobot />,
        label: t("sidebar.chat"),
      },
      {
        key: "preferences",
        icon: <FaBars />,
        label: t("sidebar.preferences"),
      },
      {
        key: "docrepo",
        icon: <FaFolder />,
        // keep the original text, but we navigate centrally on click
        label: t("sidebar.docrepo"),
      },
      {
        key: "about",
        icon: <FaQuestionCircle />,
        label: t("sidebar.about"),
      },
      {
        key: "admin",
        icon: <FaUser />,
        label: t("sidebar.admin"),
      },
    ],
    [t],
  );

  // Sidebar component reused between Sider and Drawer
  const SidebarMenu = (
    <Menu
      mode="inline"
      selectedKeys={[selectedPage]}
      items={items}
      onClick={handleMenuClick}
    />
  );

  return (
    <ConfigProvider
      locale={esES}
      theme={lightUnahTheme}
    >
      <PreferencesFeature.components.PreferencesModal
        state={preferencesModalState}
        setState={setPreferencesModalState}
        savePreferences={savePreferences}
      />

      <Layout
      >
        {/* HEADER */}
        <div className="z-10 h-16 flex items-center gap-4 justify-start px-4 md:px-6 bg-[#1e3976]">
          <div className="md:hidden" aria-hidden>
            {/* Mobile menu button */}
            <button
              onClick={() => setDrawerVisible(true)}
              className="p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <FaBars className="text-white text-lg" />
            </button>
          </div>

          {/* Brand / Title */}
          <Link to="/chat" className="flex items-center gap-3">
            <img src="/assets/img/puma.png" alt="Puma AI" className="w-8 h-8" />

            <div style={{ lineHeight: 1 }}>
              <Typography.Title
                level={5}
                style={{
                  margin: 0,
                  color: "#fff",
                  fontWeight: 700,
                  letterSpacing: 0.3,
                }}
              >
                Pum
                <span
                  aria-hidden
                  style={{
                    marginLeft: 6,
                    background:
                      "linear-gradient(90deg,#00f5ff 0%,#0084ff 25%,#7b2ff7 50%,#ff00d4 75%,#00f5ff 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    fontFamily: "monospace",
                    backgroundSize: "200% 200%",
                  }}
                  className="monospace animate-gradient"
                >
                  AI
                </span>
              </Typography.Title>
              <div style={{ color: "#9aa4b2", fontSize: 12, marginTop: 2 }}>
                {t(`sidebar.${selectedPage}`) || ""}
              </div>
            </div>
          </Link>
        </div>

        <Layout hasSider>
          {/* SIDEBAR (Desktop) */}
          <Sider
            width={240}
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            className="z-20 hidden md:flex flex-col"
          >
            <div style={{ padding: "12px 8px", flex: 1, overflow: "auto" }}>
              {SidebarMenu}
            </div>

            <div style={{ padding: 12, opacity: 0.82 }}>
              <img
                src="/assets/img/lucem.png"
                className="w-full"
              />
            </div>
          </Sider>

          {/* DRAWER (Mobile) */}
          <Drawer
            title="Menú"
            placement="left"
            closable
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            className="md:hidden"
          >
            <div style={{ padding: 12 }}>{SidebarMenu}</div>
          </Drawer>

          {/* MAIN CONTENT */}
          <Layout style={{ background: "transparent" }}>
            <Content
              style={{
                minHeight: "calc(100vh - 64px)",
                background: "transparent",
              }}
              className="relative"
            >
              {children}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
