import { PublicFooter } from "@/components/navigation/PublicFooter";
import { PublicNavbar } from "@/components/navigation/PublicNavbar";

/**
 * Chrome shared by every public page: the navbar, the main landmark that the
 * skip link targets, and the footer.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <PublicNavbar />
      <main id="main-content" style={{ flex: 1 }}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
