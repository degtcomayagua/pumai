import { useNavigate } from "@tanstack/react-router";

import {
  ConfigProvider,
  Layout,
  Spin,
} from "antd";
import esES from "antd/locale/es_ES";

import { useDispatch, useSelector } from "react-redux";

import { useTranslation } from "react-i18next";

import type { RootState } from "../store";

import { unahTheme } from "../themes/unah";

interface LayoutProps {
  children: React.ReactNode;
}

export default function GeneralLayout({ children }: LayoutProps) {

  const { t } = useTranslation(["layouts"], { keyPrefix: "admin" });

  const isDark = true;

  return (
    <ConfigProvider
      locale={esES}
      theme={unahTheme}
    >
      <Layout hasSider>
        {/* Main Content */}
        <Layout
          style={{ background: "transparent" }}
          className={`min-h-screen ${isDark ? "dark" : ""}`}
        >
          <div className={`p-4 dark:text-white min-h-[calc(100vh)] flex items-center justify-center`}>
            {children}
          </div>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
