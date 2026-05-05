import { BookOpen, Droplet, Dumbbell, Grid3X3, Leaf, Link2, Menu, Moon, Pill, Settings, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { usePhenoStore } from "../../hooks/usePhenoStore";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

const mobileNav = [
  { to: "/dashboard", label: "Dashboard", icon: Grid3X3 },
  { to: "/sleep", label: "Sleep", icon: Moon },
  { to: "/nutrition", label: "Nutrition", icon: Leaf },
  { to: "/training", label: "Training", icon: Dumbbell },
  { to: "/bloodwork", label: "Bloodwork", icon: Droplet },
  { to: "/supplements", label: "Supplements", icon: Pill },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/pheno", label: "Pheno AI", icon: Sparkles },
  { to: "/integrations", label: "Integrations", icon: Link2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Topbar() {
  const toggle = usePhenoStore((state) => state.toggle);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-base/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <Button variant="ghost" className="h-10 px-2 font-mono text-primary md:hidden" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} PhenoAgent
        </Button>
        <div className="hidden font-mono text-sm text-secondary md:block">Unified Health Intelligence</div>
        <Button variant="outline" onClick={toggle}><Sparkles className="h-4 w-4 text-ai" /> Pheno</Button>
      </div>
      {menuOpen ? (
        <nav className="grid max-h-[calc(100vh-4rem)] grid-cols-2 gap-1 overflow-y-auto border-t border-line bg-surface p-3 md:hidden">
          {mobileNav.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => cn("flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-secondary transition hover:bg-elevated hover:text-primary", isActive && "bg-elevated text-primary", item.to === "/pheno" && "text-ai")}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
