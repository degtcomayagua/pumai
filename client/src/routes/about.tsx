import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Input,
  Button,
  Spin,
  message as antdMessage,
  Modal,
  Select,
  Checkbox,
  Typography,
} from "antd";
import { FaPaperPlane } from "react-icons/fa";
const { Paragraph, Title } = Typography;

import AIFeature, { ChatMessage } from "../features/ai";
import GeneralLayout from "../layouts/User";

import { useTranslation } from "react-i18next";

import { useSelector } from "react-redux";
import type { RootState } from "../store";

export const Route = createFileRoute("/about")({
  component: Page,
});

function Page() {
  const { t } = useTranslation(["pages"], {
    keyPrefix: "about",
  });

  const { preferences: userPreferences } = useSelector(
    (state: RootState) => state.preferences,
  );

  return (
    <GeneralLayout selectedPage="about">
      <div style={{ padding: 24 }}>
        <Title level={2}>{t("title")}</Title>
        <Paragraph>{t("description")}</Paragraph>
        <Paragraph>
          {t("welcomeMessage", { name: userPreferences?.name || "Usuario" })}
        </Paragraph>
      </div>
    </GeneralLayout>
  );
}
