import { NavLink } from "react-router-dom";

const LINKS: { to: string; label: string }[] = [
  { to: "/", label: "Home" },
  { to: "/velouri", label: "Velouri" },
  { to: "/plugins", label: "Plugins" },
  { to: "/docs", label: "Docs" },
  { to: "/settings", label: "Settings" },
];

export function Nav() {
  return (
    <header className="topnav">
      <NavLink to="/" className="brand mono">
        AGNA
      </NavLink>
      <nav aria-label="Primary">
        {LINKS.map((link) => (
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
