import { NavLink } from "react-router-dom";

import { isVelouriHost } from "../lib/host";

const LINKS: { to: string; label: string }[] = [
  { to: "/", label: "Home" },
  { to: "/velouri", label: "Velouri" },
  { to: "/plugins", label: "Plugins" },
  { to: "/docs", label: "Docs" },
  { to: "/settings", label: "Settings" },
];

export function Nav() {
  const velouriHost = isVelouriHost();
  const links = velouriHost ? LINKS.filter((link) => link.to !== "/") : LINKS;

  return (
    <header className="topnav">
      <NavLink to={velouriHost ? "/velouri" : "/"} className="brand mono">
        {velouriHost ? "VELOURI" : "AGNA"}
      </NavLink>
      <nav aria-label="Primary">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `navlink${isActive ? " navlink-active" : ""}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
