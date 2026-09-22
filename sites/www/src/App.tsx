import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AgnamoHeader from "./components/AgnamoHeader";
import { Nav } from "./components/Nav";
import { isVelouriHost } from "./lib/host";
import About from "./pages/About";
import Data from "./pages/Data";
import Docs from "./pages/Docs";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Plugins from "./pages/Plugins";
import Privacy from "./pages/Privacy";
import Settings from "./pages/Settings";
import Terms from "./pages/Terms";
import Velouri from "./pages/Velouri";

const VELOURI_TITLE = "Velouri";
const VELOURI_DESCRIPTION =
  "Velouri — the companion stage that renders the Agna gallery in three dimensions.";

export default function App() {
  const velouriHost = isVelouriHost();

  useEffect(() => {
    if (!velouriHost) return;
    document.title = VELOURI_TITLE;
    document.querySelector('meta[name="description"]')?.setAttribute("content", VELOURI_DESCRIPTION);
  }, [velouriHost]);

  return (
    <div className="app-shell">
      <AgnamoHeader />
      <Nav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={velouriHost ? <Navigate to="/velouri" replace /> : <Home />} />
          <Route path="/velouri" element={<Velouri />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/docs" element={<Docs />} />
          {/* Settings and Profile render the same page (plan: "one page"). */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/data" element={<Data />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to={velouriHost ? "/velouri" : "/"} replace />} />
        </Routes>
      </main>
    </div>
  );
}
