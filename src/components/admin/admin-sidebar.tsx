
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users2,
  QrCode,
  Settings,
  LogOut,
  Gamepad2,
  PanelLeft,
  Globe,
  History,
  Calendar,
  LayoutGrid,
  CreditCard,
  ShoppingBasket,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "../logo";
import { useAuth, useDoc, useFirestore } from "@/firebase";
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
import { useEffect, useState } from "react";
import { collection, collectionGroup, doc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useUser } from "@/firebase/provider";
import { ThemeToggle } from "../theme-toggle";

export function AdminHeader() {
    const auth = useAuth();
    const router = useRouter();
    const { setLanguage } = useLanguage();
    const { t } = useTranslation();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [pendingReservations, setPendingReservations] = useState(0);

    // Check admin status
    useEffect(() => {
        if (user && firestore) {
            const adminRef = doc(firestore, 'admins', user.uid);
            const unsub = onSnapshot(adminRef, (doc) => {
                setIsAdmin(doc.exists());
            });
            return () => unsub();
        } else {
            setIsAdmin(false);
        }
    }, [user, firestore]);

    // Listen for pending reservations if the user is an admin
    useEffect(() => {
        if (!firestore || !isAdmin) {
            setPendingReservations(0);
            return;
        }

        const q = query(
          collectionGroup(firestore, 'reservations'), 
          where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingReservations(snapshot.size);
        }, (error) => {
            console.error("Error fetching pending reservations:", error);
            setPendingReservations(0);
        });

        return () => unsubscribe();
    }, [firestore, isAdmin]);


    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
        }
    };
    
    const handleLinkClick = () => {
        setIsSheetOpen(false);
    };

    const navItems = [
      { href: "/admin", icon: Home, label: t('dashboard') },
      { href: "/admin/statistics", icon: LineChart, label: t('advancedStatistics') },
      { href: "/admin/clients", icon: Users2, label: t('clients') },
      { href: "/admin/stations", icon: Gamepad2, label: t('stations') },
      { href: "/admin/consumption", icon: ShoppingBasket, label: t('consumption') },
      { href: "/admin/subscriptions", icon: CreditCard, label: "Abonnements"},
      { href: "/admin/content", icon: LayoutGrid, label: "Contenu" },
      { href: "/admin/reservations", icon: Calendar, label: t('reservationManagement'), notifCount: pendingReservations},
      { href: "/admin/scan", icon: QrCode, label: t('scanner') },
      { href: "/admin/history", icon: History, label: t('history')},
      { href: "/admin/settings", icon: Settings, label: t('settings') },
    ];

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
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
                  onClick={handleLinkClick}
                >
                  <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">Warriors Gaming</span>
                </Link>
                {navItems.map((item) => (
                    <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground relative"
                    onClick={handleLinkClick}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    {item.notifCount && item.notifCount > 0 ? (
                        <span className="absolute left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                            {item.notifCount}
                        </span>
                    ) : null}
                  </Link>
                ))}
                  <button
                    onClick={() => { handleLogout(); handleLinkClick(); }}
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
  const { user } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pendingReservations, setPendingReservations] = useState(0);

  // Check admin status
  useEffect(() => {
    if (user && firestore) {
      const adminRef = doc(firestore, 'admins', user.uid);
      const unsub = onSnapshot(adminRef, (doc) => {
        setIsAdmin(doc.exists());
      });
      return () => unsub();
    } else {
      setIsAdmin(false);
    }
  }, [user, firestore]);
  
  // Listen for pending reservations if the user is an admin
  useEffect(() => {
    if (!firestore || !isAdmin) {
        if (pathname === '/admin/reservations') {
             setPendingReservations(0);
        }
        return;
    };

    if (pathname === '/admin/reservations') {
        setPendingReservations(0);
        return;
    }

    const q = query(
      collectionGroup(firestore, 'reservations'), 
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingReservations(snapshot.size);
    }, (error) => {
        console.error("Error fetching pending reservations:", error);
        setPendingReservations(0);
    });

    return () => unsubscribe();
  }, [firestore, isAdmin, pathname]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };
  
  const navItems = [
    { href: "/admin", icon: Home, label: t('dashboard') },
    { href: "/admin/statistics", icon: LineChart, label: t('advancedStatistics') },
    { href: "/admin/clients", icon: Users2, label: t('clients') },
    { href: "/admin/stations", icon: Gamepad2, label: t('stations') },
    { href: "/admin/consumption", icon: ShoppingBasket, label: t('consumption') },
    { href: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" },
    { href: "/admin/content", icon: LayoutGrid, label: "Contenu" },
    { href: "/admin/reservations", icon: Calendar, label: t('reservationManagement'), notifCount: pendingReservations },
    { href: "/admin/scan", icon: QrCode, label: t('scanner') },
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
                    "relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    { "bg-accent text-accent-foreground": pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin") }
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                   {item.notifCount && item.notifCount > 0 ? (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                            {item.notifCount > 9 ? '9+' : item.notifCount}
                        </span>
                    ) : null}
                </Link>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
              <Link
                href="/admin/settings"
                className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    { "bg-accent text-accent-foreground": pathname.startsWith('/admin/settings') }
                  )}
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
