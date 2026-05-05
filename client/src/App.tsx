import { Route, Routes } from "react-router-dom";
import { AuthGate } from "./components/layout/AuthGate";
import { AppShell } from "./components/layout/AppShell";
import { Bloodwork } from "./pages/Bloodwork";
import { Dashboard } from "./pages/Dashboard";
import { Integrations } from "./pages/Integrations";
import { Journal } from "./pages/Journal";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Nutrition } from "./pages/Nutrition";
import { Pheno } from "./pages/Pheno";
import { Settings } from "./pages/Settings";
import { Sleep } from "./pages/Sleep";
import { Supplements } from "./pages/Supplements";
import { Training } from "./pages/Training";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route index element={<Landing />} />
      <Route element={<AppShell />}>
        <Route path="/demo" element={<Dashboard />} />
      </Route>
      <Route element={<AuthGate />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sleep" element={<Sleep />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/training" element={<Training />} />
          <Route path="/bloodwork" element={<Bloodwork />} />
          <Route path="/supplements" element={<Supplements />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/pheno" element={<Pheno />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}
