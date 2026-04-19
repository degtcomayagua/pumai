import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { App } from "antd";

import api from "../api";
import { ILog, LogsAPITypes } from "../";

export type NullableSurgeriesListState = {
  [K in keyof LogsAPITypes.ListRequestBody]?:
  | LogsAPITypes.ListRequestBody[K]
  | null;
};
export type FetchSurgeriesFn = (
  params?: NullableSurgeriesListState,
) => Promise<void>;

type UseSurgeriesListOptions = {
  apiList?: typeof api.query;
};

export function useList({ apiList = api.query }: UseSurgeriesListOptions = {}) {
  const { message } = App.useApp();

  const { t } = useTranslation(["features"], {
    keyPrefix: "patients.hooks.useSurgeriesList",
  });
  const { t: tErrorMessages } = useTranslation(["error-messages"]);

  const [surgeriesListState, setSurgeriesListState] = useState<
    LogsAPITypes.ListRequestBody & { loading: boolean }
  >({
    loading: true,
    fields: ["_id", "metadata", "surgeon", "status", "patient"],
    populate: ["patient", "surgeon"],
    count: 20,
    page: 0,
  });

  const [surgeriesData, setSurgeriesData] = useState<{
    totalLogs: number;
    logs: ILog[];
  }>({
    logs: [],
    totalLogs: 0,
  });

  const fetchSurgeries = useCallback(
    async ({
      count = surgeriesListState.count,
      page = surgeriesListState.page,
      includeDeleted = surgeriesListState.includeDeleted,
      search = surgeriesListState.search,
    }: NullableSurgeriesListState = {}) => {
      setSurgeriesListState((prev) => ({ ...prev, loading: true }));

      const result = await apiList({
        ...surgeriesListState,
        search: search == null ? undefined : search,
        includeDeleted: includeDeleted == null ? undefined : includeDeleted,
      });

      if (result.status === "success" && result.surgeries) {
        setSurgeriesListState((prev) => ({
          ...prev,
          count: count as number,
          page: page as number,
          search: search == null ? undefined : search,
          includeDeleted: includeDeleted == null ? undefined : includeDeleted,
          loading: false,
        }));

        setSurgeriesData({
          logs: result.surgeries.map((surgery) => ({
            _id: surgery._id.toString(),
            patientName:
              (surgery.patient as IPatient).firstName +
              " " +
              (surgery.patient as IPatient).lastName,
            patientDNI: (surgery.patient as IPatient).identityNumber ?? "",
            surgeonName: (surgery.surgeon as IAccount).profile.name,
            scheduledDate: surgery.scheduledDate,
            performedDate: surgery.performedDate,
            status: surgery.status,
            deleted: surgery.metadata.deleted ?? false,
          })),

          totalLogs: result.totalSurgeries ?? 0,
        });
      } else {
        if (message) {
          message.error(tErrorMessages(`${result.status}`));
        }
        setSurgeriesListState((prev) => ({ ...prev, loading: false }));
      }
    },
    [surgeriesListState, message, t, tErrorMessages, apiList],
  );

  return {
    surgeriesListState,
    surgeriesData,
    fetchSurgeries,
  };
}

