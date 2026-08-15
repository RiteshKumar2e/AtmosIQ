import { AppShell } from "@/components/layout/AppShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <div id="main-content">{children}</div>
    </AppShell>
  );
}
