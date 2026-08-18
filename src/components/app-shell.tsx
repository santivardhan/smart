import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  Brain,
  CheckSquare,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  Scan,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  User as UserIcon,
  Warehouse,
  Coins,
  Grid3X3,
  MessageSquare,
  Radar,
  SlidersHorizontal,
  Users,
  Map as MapIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { fmtRelative } from "@/lib/engine";
import type { Role } from "@/lib/types";
import { Dot } from "@/components/status";

type NavItem = { to: string; label: string; icon: typeof Home; badge?: number };

export function useNav(role: Role): { section: string; items: NavItem[] }[] {
  const { exceptions, decisions, orders } = useStore();
  const openExc = exceptions.filter((e) => e.status !== "resolved").length;

  if (role === "customer") {
    return [
      {
        section: "My account",
        items: [
          { to: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/customer/orders", label: "My orders", icon: Package },
          { to: "/tracking", label: "Track order", icon: MapIcon },
          { to: "/feedback", label: "Feedback", icon: MessageSquare },
          { to: "/customer/notifications", label: "Notifications", icon: Bell },
          { to: "/customer/profile", label: "Profile", icon: UserIcon },
        ],
      },
    ];
  }

  if (role === "worker") {
    return [
      {
        section: "My work",
        items: [
          { to: "/worker/dashboard", label: "Worker dashboard", icon: LayoutDashboard },
          { to: "/picking", label: "Picking tasks", icon: Scan, badge: orders.filter((o) => o.stage === "picking").length },
          { to: "/packing", label: "Packing", icon: PackageCheck, badge: orders.filter((o) => o.stage === "packing").length },
          { to: "/quality-check", label: "Quality check", icon: ShieldCheck, badge: orders.filter((o) => o.stage === "qc").length },
          { to: "/dispatch", label: "Dispatch tasks", icon: Truck },
          { to: "/exceptions", label: "Exceptions", icon: AlertTriangle, badge: openExc },
          { to: "/feedback", label: "Report feedback", icon: MessageSquare },
        ],
      },
    ];
  }

  const intelligence = {
    section: "Intelligence",
    items: [
      { to: "/decision-center", label: "Decision center", icon: Brain, badge: decisions.length },
      { to: "/warehouse-operations", label: "Warehouse map", icon: Grid3X3 },
      { to: "/workforce", label: "Workforce", icon: Users },
      { to: "/simulator", label: "What-if simulator", icon: SlidersHorizontal },
      { to: "/inventory-anomalies", label: "Inventory anomalies", icon: Radar },
    ],
  };

  if (role === "manager") {
    return [
      {
        section: "Operations",
        items: [
          { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/orders", label: "Orders", icon: ClipboardList },
          { to: "/inventory", label: "Inventory", icon: Boxes },
          { to: "/allocation", label: "Allocation", icon: Package, badge: orders.filter((o) => o.allocationStatus === "pending" && o.stage !== "completed").length },
          { to: "/tracking", label: "Order tracking", icon: MapIcon },
        ],
      },
      {
        section: "Fulfilment flow",
        items: [
          { to: "/picking", label: "Picking", icon: Scan },
          { to: "/packing", label: "Packing", icon: PackageCheck },
          { to: "/quality-check", label: "Quality check", icon: ShieldCheck },
          { to: "/dispatch", label: "Dispatch", icon: Truck },
        ],
      },
      intelligence,
      {
        section: "Insight",
        items: [
          { to: "/exceptions", label: "Exceptions", icon: AlertTriangle, badge: openExc },
          { to: "/analytics", label: "Analytics", icon: BarChart3 },
          { to: "/feedback", label: "Feedback", icon: MessageSquare },
          { to: "/activity", label: "Activity log", icon: Activity },
        ],
      },
    ];
  }

  return [
    {
      section: "Overview",
      items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/orders", label: "Orders", icon: ClipboardList },
        { to: "/inventory", label: "Inventory", icon: Boxes },
        { to: "/tracking", label: "Order tracking", icon: MapIcon },
      ],
    },
    {
      section: "Fulfilment flow",
      items: [
        { to: "/allocation", label: "Allocation", icon: Package, badge: orders.filter((o) => o.allocationStatus === "pending" && o.stage !== "completed").length },
        { to: "/picking", label: "Picking", icon: Scan },
        { to: "/packing", label: "Packing", icon: PackageCheck },
        { to: "/quality-check", label: "Quality check", icon: ShieldCheck },
        { to: "/dispatch", label: "Dispatch", icon: Truck },
      ],
    },
    intelligence,
    {
      section: "Control",
      items: [
        { to: "/exceptions", label: "Exceptions", icon: AlertTriangle, badge: openExc },
        { to: "/analytics", label: "Analytics", icon: BarChart3 },
        { to: "/feedback", label: "Feedback", icon: MessageSquare },
        { to: "/finance", label: "Finance", icon: Coins },
        { to: "/users", label: "Users", icon: Users },
        { to: "/activity", label: "Activity log", icon: Activity },
        { to: "/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
        <Warehouse className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-base font-bold tracking-tight">SmartFulfill</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Ops control</p>
      </div>
    </div>
  );
}

function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const groups = useNav(role);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-6 p-3">
      {groups.map((g) => (
        <div key={g.section}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{g.section}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/15 font-semibold text-primary shadow-[inset_2px_0_0_var(--color-primary)]"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {!!item.badge && (
                      <span className="rounded-full bg-critical/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-critical">{item.badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function GlobalSearch({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { orders, inventory, exceptions, user } = useStore();
  const navigate = useNavigate();
  const isCustomer = user?.role === "customer";

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search orders, SKUs, products, customers, exceptions…" />
      <CommandList>
        <CommandEmpty>No matches found.</CommandEmpty>
        <CommandGroup heading="Orders">
          {orders.slice(0, 40).map((o) => (
            <CommandItem key={o.id} value={`${o.id} ${o.customer} ${o.items.map((i) => i.name).join(" ")}`} onSelect={() => go(isCustomer ? `/customer/orders/${o.id}` : `/orders/${o.id}`)}>
              <ClipboardList className="size-4" />
              <span className="font-mono">{o.id}</span>
              <span className="text-muted-foreground">· {o.customer}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {!isCustomer && (
          <CommandGroup heading="Inventory">
            {inventory.map((i) => (
              <CommandItem key={i.sku} value={`${i.sku} ${i.name} ${i.category}`} onSelect={() => go(`/inventory/${i.sku}`)}>
                <Boxes className="size-4" />
                <span className="font-mono">{i.sku}</span>
                <span className="text-muted-foreground">· {i.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!isCustomer && (
          <CommandGroup heading="Exceptions">
            {exceptions.map((e) => (
              <CommandItem key={e.id} value={`${e.id} ${e.type} ${e.orderId ?? ""}`} onSelect={() => go(`/exceptions/${e.id}`)}>
                <AlertTriangle className="size-4" />
                <span className="font-mono">{e.id}</span>
                <span className="text-muted-foreground">· {e.type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function NotificationBell() {
  const { notifications, markNotificationRead, markAllRead, user } = useStore();
  const navigate = useNavigate();
  const unread = notifications.filter((n) => !n.read).length;
  const visible = user?.role === "customer" ? notifications.filter((n) => n.severity !== "warning" || n.href.startsWith("/customer")) : notifications;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" title="Notifications">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-critical font-mono text-[9px] font-bold text-critical-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          <ul className="divide-y divide-border">
            {visible.slice(0, 12).map((n) => (
              <li key={n.id}>
                <button
                  className={cn("w-full px-3 py-2.5 text-left transition-colors hover:bg-accent", !n.read && "bg-primary/5")}
                  onClick={() => {
                    markNotificationRead(n.id);
                    navigate({ to: user?.role === "customer" ? "/customer/notifications" : n.href });
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Dot t={n.severity === "critical" ? "critical" : n.severity === "warning" ? "warning" : n.severity === "success" ? "success" : "info"} />
                    <p className="flex-1 truncate text-sm font-medium">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground">{fmtRelative(n.at)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 pl-3.5 text-xs text-muted-foreground">{n.body}</p>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

const homeFor = (r: Role) =>
  r === "worker" ? "/worker/dashboard" : r === "customer" ? "/customer/dashboard" : "/dashboard";

export function AppShell({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const roles = Array.isArray(role) ? role : [role];
  const primary = roles[0]!;
  const { user, logout, authReady } = useStore();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) navigate({ to: `/login/${primary === "manager" ? "manager" : primary}` });
    else if (!roles.includes(user.role)) navigate({ to: homeFor(user.role) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, primary, navigate, authReady]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initials = useMemo(
    () => (user?.name ?? "SF").split(" ").map((p) => p[0]).slice(0, 2).join(""),
    [user?.name],
  );

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Checking your session…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>
        <ScrollArea className="flex-1">
          <SidebarNav role={user.role} />
        </ScrollArea>
        <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
          <p className="font-medium capitalize text-foreground">{user.role} portal</p>
          <p>Warehouse DC-01 · Rotterdam</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" title="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-16 items-center border-b border-border px-4">
                <Brand />
              </div>
              <ScrollArea className="h-[calc(100vh-4rem)]">
                <SidebarNav role={user.role} onNavigate={() => setMobileOpen(false)} />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <Brand />
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search orders, SKUs and customers"
            title="Search (⌘K)"
            className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 lg:ml-0 lg:w-80"
          >
            <Search className="size-4" />
            <span className="hidden lg:inline">Search orders, SKUs, customers…</span>
            <kbd className="ml-auto hidden rounded border border-border px-1.5 font-mono text-[10px] lg:inline">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu" title="Account">
                  <span className="grid size-8 place-items-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary">{initials}</span>
                  <span className="hidden text-left leading-tight md:block">
                    <span className="block text-xs font-semibold">{user.name}</span>
                    <span className="block text-[10px] capitalize text-muted-foreground">{user.role}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                    <Settings className="size-4" /> Settings
                  </DropdownMenuItem>
                )}
                {user.role === "customer" && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/customer/profile" })}>
                    <UserIcon className="size-4" /> Profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </div>

      <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />
    </div>
  );
}

export { CheckSquare };
