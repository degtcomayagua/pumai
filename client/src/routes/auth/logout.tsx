import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useTranslation } from "react-i18next";

import AuthFeature from "../../features/auth/";

import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store";
import { unwrapResult } from "@reduxjs/toolkit";

import { Button, Card } from "antd";
import GeneralLayout from "client/src/layouts/General";

export const Route = createFileRoute("/auth/logout")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { account } = useSelector((state: RootState) => state.auth);

  const dispatch = useDispatch<typeof import("../../store").store.dispatch>();
  const { t } = useTranslation(["pages"], { keyPrefix: "auth.logout" });

  const logout = async () => {
    const result = await dispatch(AuthFeature.actions.logout());
    if (result.type === "accounts/logout/fulfilled") {
      navigate({
        to: "/",
      });
    }
  };

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

  return (
    <GeneralLayout>
      {account && (
        <main className="min-h-screen flex items-center justify-center">
          <Card>
            <div className="text-2xl font-bold text-center">
              {t("title")}
            </div>
            <div className="text-center">
              <p>{t("description")}</p>
              <Button
                className="mt-4"
                type="primary"
                variant="solid"
                color="red"
                onClick={logout}
              >
                {t("button")}
              </Button>

              <br />

              <Button
                className="mt-4"
                type="default"
                variant="solid"
                onClick={() => {
                  navigate({
                    to: "/admin",
                  });
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </Card>
        </main>
      )}

      {!account && <p>Loading your account...</p>}
    </GeneralLayout>
  );
}