import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { Space, Layout, Card, Row, Col, Typography, Button } from "antd";
const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

import {
  FaTachometerAlt,
  FaIdBadge,
  FaPills,
  FaHospitalSymbol,
  FaUsers,
  FaTerminal,
  FaUser,
  FaUserShield,
  FaFile,
} from "react-icons/fa";

import type { RootState } from "../../store";

import AuthFeature from "../../features/auth/";
import AdminLayout from "../../layouts/Admin";
import type { MenuItemType } from "antd/es/menu/interface";
import type { IAccountRole } from "../../features/roles";

import type { Permission } from "../../../../shared/types/permissions";
import { TiCalendar } from "react-icons/ti";

export const Route = createFileRoute("/admin/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const dispatch = useDispatch<typeof import("../../store").store.dispatch>();
  const { account } = useSelector((state: RootState) => state.auth);

  const { t: tpage } = useTranslation(["pages"], {
    keyPrefix: "admin.index",
  });

  useEffect(() => {
    if (!account) {
      (async () => {
        const result = await dispatch(AuthFeature.actions.fetch());
        if (AuthFeature.actions.fetch.rejected.match(result)) {
          navigate({ to: "/auth/login" });
        }
      })();
    }
  }, [account, dispatch, navigate]);

  const hasPermission = (permission: Permission): boolean => {
    if (account) {
      if (
        (account.data.role as IAccountRole).permissions.includes(permission) ||
        (account.data.role as IAccountRole).permissions.includes("*")
      )
        return true;
      return false;
    }
    return false;
  };

  const menuItems: Array<{
    key: string;
    link: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
  }> = [
    // === Overview & Core ===
    {
      key: "documents",
      link: "/admin/rag-documents",
      label: tpage("items.rag-documents.title"),
      description: tpage("items.rag-documents.description"),
      icon: <FaFile className="text-6xl" />, // Better for dashboards
    },

    {
      key: "accounts",
      link: "/admin/accounts",
      label: tpage("items.accounts.title"),
      description: tpage("items.accounts.description"),
      icon: <FaUser className="text-6xl" />, // Better for dashboards
    },

    {
      key: "account-roles",
      link: "/admin/accounts/roles",
      label: tpage("items.account-roles.title"),
      description: tpage("items.account-roles.description"),
      icon: <FaUserShield className="text-6xl" />, // Better for dashboards
    },
  ];

  const greeting =
    new Date().getHours() < 12
      ? tpage("greetings.morning")
      : new Date().getHours() < 18
        ? tpage("index.greetings.afternoon")
        : tpage("greetings.evening");

  return (
    <AdminLayout>
      <div className="">
        <Title level={2} style={{ marginBottom: 24 }}>
          {greeting}, {account?.profile.name}
        </Title>
        <Paragraph>{tpage("description")}</Paragraph>

        <div className="flex gap-2 flex-wrap mt-8 items-stretch justify-center">
          {menuItems.map((item) => (
            <Card
              hoverable
              className="w-1/4"
              key={item.key}
              onClick={() => {
                navigate({ to: item.link as any });
              }}
            >
              <div className="flex items-center flex-1 justify-center gap-4 h-full">
                <Col className="text-blue-500">{item.icon}</Col>
                <Col>
                  <p className="text-2xl font-bold text-blue-500">
                    {item.label}
                  </p>
                  {item.description && (
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                      {item.description}
                    </Paragraph>
                  )}
                </Col>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
