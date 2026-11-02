import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { hasSession } from "@/lib/api.functions";
import { AppShell } from "@/components/sm/AppShell";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const { authed } = await hasSession();
    if (!authed) throw redirect({ to: "/login" });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
