"use client";

import { Menu, Wind, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAME, PUBLIC_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PublicNavbar() {
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent the page behind the fullscreen mobile menu from scrolling.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className={cn("navbar", scrolled && "is-scrolled")}>
      <nav className="container navbar-inner" aria-label="Main navigation">
        <Link href="/" className="brand" aria-label={`${APP_NAME} home`}>
          <span className="brand-mark" aria-hidden="true">
            <Wind size={18} />
          </span>
          {APP_NAME}
        </Link>

        <ul className="nav-links">
          {PUBLIC_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn("nav-link", isActive(item.href) && "is-active")}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          {!loading && isAuthenticated ? (
            <Button asChild variant="primary">
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild variant="primary">
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}

          <button
            type="button"
            className="nav-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div className="mobile-menu" id="mobile-menu">
          <ul className="mobile-menu-links">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn("mobile-menu-link", isActive(item.href) && "is-active")}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mobile-menu-actions">
            {!loading && isAuthenticated ? (
              <Button asChild variant="primary" size="lg" block>
                <Link href="/dashboard">Open Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="secondary" size="lg" block>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild variant="primary" size="lg" block>
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
