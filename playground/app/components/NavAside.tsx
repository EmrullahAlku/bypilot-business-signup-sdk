"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview", icon: "⊞" },
  { href: "/whatsapp", label: "WhatsApp", icon: "●", color: "#25D366" },
  { href: "/facebook", label: "Facebook", icon: "●", color: "#1877F2" },
  { href: "/instagram", label: "Instagram", icon: "●", color: "#E1306C" },
];

export default function NavAside() {
  const pathname = usePathname();

  return (
    <aside className="aside">
      <div className="aside-header">
        <span className="aside-logo">ByPilot</span>
        <span className="aside-sub">SDK Playground</span>
      </div>

      <nav className="aside-nav">
        <p className="aside-section-label">Providers</p>
        {links.map(({ href, label, icon, color }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`aside-link${active ? " aside-link-active" : ""}`}
              style={active && color ? { color } : undefined}
            >
              <span
                className="aside-link-icon"
                style={color ? { color: active ? color : undefined } : undefined}
              >
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="aside-footer">
        <a
          href="https://developers.facebook.com/docs/whatsapp/embedded-signup"
          target="_blank"
          rel="noreferrer"
          className="aside-footer-link"
        >
          Meta Docs ↗
        </a>
      </div>
    </aside>
  );
}
