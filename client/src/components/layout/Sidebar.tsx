import { BookOpen, Droplet, Dumbbell, Grid3X3, Leaf, Link2, Moon, Pill, Settings, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

const nav = [
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

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-line bg-surface px-4 py-5 md:flex md:flex-col">
      <div className="mb-7 font-mono text-xl text-primary">PhenoAgent</div>
      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item, index) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-secondary transition hover:bg-elevated hover:text-primary", isActive && "bg-elevated text-primary", index === 7 && "mt-4 text-ai")}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line pt-4">
        <div className="flex items-center gap-3 rounded-md bg-elevated px-3 py-3">
          <div className="h-8 w-8 rounded-full bg-good/20" />
          <div><p className="text-sm text-primary">Demo User</p><p className="text-xs text-secondary">Local mode</p></div>
        </div>
      </div>
    </aside>
  );
}
