import { createFileRoute } from "@tanstack/react-router";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import AdminPageLayout from "../../../layouts/Admin";
import LogsViewer from "../../../features/logs/components/LogsViewer";
import type { Permission } from "../../../../../shared/types/permissions";

export const Route = createFileRoute("/admin/logs/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { account } = useSelector((state: RootState) => state.auth);
  const permissions = (
    (account?.data?.role as any)?.permissions ?? []
  ) as Permission[];
  const canRead =
    permissions.includes("*") || permissions.includes("logs:read");

  if (!canRead) {
    return (
      <AdminPageLayout selectedPage="logs">
        <div className="p-8 text-center text-gray-500">
          No autorizado para ver los logs del sistema.
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout selectedPage="logs">
      <h2 className="text-xl font-semibold mb-4">Logs del Sistema</h2>
      <LogsViewer />
    </AdminPageLayout>
  );
}
