
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users2,
  QrCode,
  Sparkles,
  Settings,
  LogOut,
  Gamepad2,
  PanelLeft,
  Globe,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "../logo";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, useTranslation } from "@/hooks/use-translation";
import { ThemeToggle } from "../theme-toggle";


export function AdminHeader() {
    const auth = useAuth();
    const { setLanguage } = useLanguage();
    const { t } = useTranslation();
    const handleLogout = () => {
        if (auth) {
        signOut(auth);
        }
    };
    
    const navItems = [
      { href: "/admin", icon: Home, label: t('dashboard') },
      { href: "/admin/clients", icon: Users2, label: t('clients') },
      { href: "/admin/stations", icon: Gamepad2, label: t('stations') },
      { href: "/admin/scan", icon: QrCode, label: t('scanner') },
      { href: "/admin/loyalty", icon: Sparkles, label: t('loyaltyAI') },
      { href: "/admin/history", icon: History, label: t('history')},
    ];

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="/admin"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">Warriors Gaming</span>
                </Link>
                {navItems.map((item) => (
                    <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                    >
                    <LogOut className="h-5 w-5" />
                    {t('logOut')}
                </button>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Globe className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Toggle language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setLanguage('fr')}>
                  Français
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLanguage('en')}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLanguage('ar')}>
                  العربية
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </header>
    )
}


export function AdminSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { t } = useTranslation();

  const handleLogout = () => {
    if (auth) {
      signOut(auth);
    }
  };
  
  const navItems = [
    { href: "/admin", icon: Home, label: t('dashboard') },
    { href: "/admin/clients", icon: Users2, label: t('clients') },
    { href: "/admin/stations", icon: Gamepad2, label: t('stations') },
    { href: "/admin/scan", icon: QrCode, label: t('scanner') },
    { href: "/admin/loyalty", icon: Sparkles, label: t('loyaltyAI') },
    { href: "/admin/history", icon: History, label: t('history')},
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/admin"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">Warriors Gaming</span>
          </Link>
          {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    { "bg-accent text-accent-foreground": pathname === item.href || (item.href.includes(item.label.toLowerCase()) && pathname.includes(item.label.toLowerCase())) }
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">{t('settings')}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">{t('logOut')}</span>
              </button>
        </nav>
    </aside>
  );
}
