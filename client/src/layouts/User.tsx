import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import esES from "antd/locale/es_ES";
import { Layout, Menu, Drawer, ConfigProvider, Tooltip, Badge } from "antd";
import type { MenuProps } from "antd";
const { Header, Sider, Content } = Layout;
import { FaBars, FaRobot, FaFolder, FaUser } from "react-icons/fa6";
import { FaQuestionCircle, FaCog } from "react-icons/fa";

import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { useTranslation } from "react-i18next";

import PreferencesFeature from "../features/preferences";
import { unahTheme } from "../themes/unah";

interface LayoutProps {
  children: React.ReactNode;
  selectedPage?: string;
}

export default function UserLayout({
  children,
  selectedPage = "chat",
}: LayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(["layouts"], { keyPrefix: "general" });

  const { status: serverConnectionStatus } = useSelector(
    (state: RootState) => state.status,
  );
  const isConnected = serverConnectionStatus === "succeeded";

  const { preferences: userPreferences } = useSelector(
    (state: RootState) => state.preferences,
  );

  const {
    savePreferences,
    state: preferencesModalState,
    setState: setPreferencesModalState,
    openModal: openPreferencesModal,
  } = PreferencesFeature.hooks.usePreferencesModal({
    onSuccess: () => setTimeout(() => window.location.reload(), 1000),
  });

  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "preferences") {
      openPreferencesModal();
      setDrawerVisible(false);
      return;
    }

    navigate({ to: `/${key}` });
    setDrawerVisible(false);
  };

  const items: MenuProps["items"] = useMemo(
    () => [
      { key: "chat", icon: <FaRobot />, label: t("sidebar.chat") },
      { key: "docrepo", icon: <FaFolder />, label: t("sidebar.docrepo") },
      { key: "about", icon: <FaQuestionCircle />, label: t("sidebar.about") },
      { key: "admin", icon: <FaUser />, label: t("sidebar.admin") },
      { type: "divider" },
      { key: "preferences", icon: <FaCog />, label: t("sidebar.preferences") },
    ],
    [t],
  );

  const SidebarMenu = (
    <Menu
      mode="inline"
      selectedKeys={[selectedPage]}
      items={items}
      onClick={handleMenuClick}
      style={{ background: "transparent", border: "none" }}
    />
  );

  return (
    <ConfigProvider locale={esES} theme={unahTheme}>
      <PreferencesFeature.components.PreferencesModal
        state={preferencesModalState}
        setState={setPreferencesModalState}
        savePreferences={savePreferences}
      />

      <Layout className="min-h-screen dark">
        <Header
          className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 h-16 border-b border-[#262a33]"
          style={{ background: "#16181d" }}
        >
          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <button
                onClick={() => setDrawerVisible(true)}
                className="p-2 rounded-md hover:bg-white/10 text-[#e6e9f0]"
              >
                <FaBars className="text-lg" />
              </button>
            </div>

            <Link to="/chat" className="flex items-center gap-3 no-underline">
              <div style={{ lineHeight: 1 }}>
                <div
                  style={{
                    margin: 0,
                    color: "#fff",
                    fontWeight: 700,
                    letterSpacing: 0.3,
                  }}
                >
                  Pum
                  <span
                    style={{
                      marginLeft: 1,
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
                </div>
                <div style={{ color: "#9aa4b2", fontSize: 12, marginTop: 2 }}>
                  Chat Beta
                </div>
              </div>
            </Link>
          </div>
        </Header>

        <Layout hasSider>
          <Sider
            width={240}
            collapsible
            collapsed={collapsed}
            onCollapse={(v) => setCollapsed(v)}
            breakpoint="md"
            className="hidden md:flex flex-col"
            theme={"dark"}
            style={{ background: "#16181d" }}
          >
            <div style={{ padding: "12px 8px", flex: 1, overflow: "auto" }}>
              {SidebarMenu}
            </div>
            <div style={{ padding: 12, opacity: 0.12 }}>
              <img
                src="/assets/img/lucem.png"
                alt="UNAH"
                className="grayscale w-full invert dark:invert-0"
              />
            </div>
          </Sider>

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

          <Layout style={{ background: "transparent" }}>
            <Content
              style={{
                minHeight: "calc(100vh - 1094px)",
                background: "#0f1115",
              }}
              className="relative overflow-auto"
            >
              {children}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
