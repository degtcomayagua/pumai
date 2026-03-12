import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { App, Modal, Button, Form, Input, Typography, Card } from "antd";

import { FaChevronLeft } from "react-icons/fa";
import { useTranslation } from "react-i18next";

import { unwrapResult } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../store";

import AuthFeature, { type AuthAPITypes } from "../../features/auth/";
import type { AccountAPITypes } from "@/features/accounts";
// import { LoginRequestBody } from "../../../../shared/types/api/auth";

// import TerminalFeature from "../../features/terminals/";

export const Route = createFileRoute("/auth/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { t } = useTranslation(["pages"], { keyPrefix: "auth.login" });

  const dispatch = useDispatch<AppDispatch>();
  const { account } = useSelector((state: RootState) => state.auth);

  const [loginState, setLoginState] = useState<
    AuthAPITypes.LoginRequestBody & { loading: boolean; tfaModalOpen: boolean }
  >({
    loading: false,
    tfaModalOpen: false,
    email: "",
    password: "",
    tfaCode: "",
  });

  const handleLogin = async () => {
    if (loginState.loading) return;
    setLoginState((s) => ({ ...s, loading: true }));

    const parsedData = AuthFeature.schemas.loginAccountSchema.safeParse({
      ...loginState,
      tfaCode:
        loginState.tfaCode!.trim() == ""
          ? undefined
          : loginState.tfaCode!.trim(),
    });

    if (!parsedData.success) {
      for (const error of parsedData.error.issues) {
        message.error(t(`login.messages.${error.message}`));
      }
      setLoginState((s) => ({ ...s, loading: false }));
      return;
    }

    const result = await dispatch(AuthFeature.actions.login(parsedData.data));
    const payload = unwrapResult(result);

    switch (payload.status) {
      case "success":
        message.success(t("login.messages.success"));
        break;
      case "requires-tfa":
        message.info(t("login.messages.requires-tfa"));
        setLoginState((s) => ({ ...s, loading: false, requiresTfa: true }));
        break;
      case "invalid-credentials":
        message.error(t("login.messages.invalid-credentials"));
        break;
      case "invalid-tfa-code":
        message.error(t("login.messages.invalid-tfa-code"));
        break;
    }

    setLoginState((s) => ({ ...s, loading: false }));
  };

  useEffect(() => {
    if (account) {
      navigate({ to: "/admin" });
    }
  }, [account, navigate]);

  // useEffect(() => {
  // 	if (!terminal) {
  // 		(async () => {
  // 			const fingerPrint =
  // 				await TerminalFeature.utils.getTerminalFingerPrint();
  // 			const result = await dispatch(
  // 				TerminalFeature.actions.fetchTerminal(fingerPrint),
  // 			);
  // 			const payload = unwrapResult(result);
  //
  // 			if (
  // 				AuthFeature.actions.fetch.rejected.match(result) ||
  // 				payload.status == "terminal-not-found"
  // 			) {
  // 				navigate({ to: "/terminals/activate" });
  // 			}
  // 		})();
  // 	}
  // }, [terminal]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 relative">
      <Modal
        open={loginState.tfaModalOpen}
        title={t("login.tfaModal.title")}
        onOk={handleLogin}
        okText={t("login.tfaModal.submit")}
        onCancel={() => {
          setLoginState((s) => ({ ...s, requiresTfa: false, tfa: "" }));
        }}
        cancelText={t("dashboard:common.cancel")}
      >
        <p>{t("login.tfaModal.description")}</p>

        <br />

        <Form layout="vertical">
          <Form.Item label={t("login.tfaModal.fields.tfaCode")} required>
            <Input.Password
              value={loginState.tfaCode}
              onChange={(e) =>
                setLoginState({ ...loginState, tfaCode: e.target.value })
              }
              autoComplete="one-time-code"
              placeholder={t("login.tfaModal.fields.tfaCodePlaceholder")}
            />
          </Form.Item>
        </Form>
      </Modal>

      <div className="absolute top-4 left-4">
        <Button
          type="text"
          icon={<FaChevronLeft />}
          onClick={() => navigate({ to: "/" })}
        >
          {t("back")}
        </Button>
      </div>

      <Card
        title={
          <Typography.Title level={3} className="!mb-0 text-center">
            {t("title")}
          </Typography.Title>
        }
        className="w-full max-w-md shadow-lg"
      >
        <Typography.Paragraph className="text-center mb-6">
          {t("description")}
        </Typography.Paragraph>

        <Form layout="vertical">
          <Form.Item label={t("fields.email")} required>
            <Input
              value={loginState.email}
              onChange={(e) =>
                setLoginState({ ...loginState, email: e.target.value })
              }
              autoComplete="email"
              type="email"
              placeholder={t("fields.emailPlaceholder")}
            />
          </Form.Item>

          <Form.Item label={t("fields.password")} required>
            <Input.Password
              value={loginState.password}
              onChange={(e) =>
                setLoginState({ ...loginState, password: e.target.value })
              }
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loginState.loading}
              block
              onClick={handleLogin}
            >
              {t("submit")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
