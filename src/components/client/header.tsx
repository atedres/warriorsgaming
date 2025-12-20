
'use client';

import Link from "next/link";
import { Globe, LogIn, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "../logo";
import { ThemeToggle } from "../theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/use-translation";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function ClientHeader() {
  const { setLanguage } = useLanguage();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();


  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  return (
    <header className="px-4 lg:px-6 h-14 flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b">
      <Link href="/" className="flex items-center justify-center mr-4">
        <Logo />
        <span className="sr-only">Warriors Gaming</span>
      </Link>
      <nav className="ml-auto flex items-center gap-2 sm:gap-4">
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
        
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <UserIcon className="h-5 w-5" />
                <span className="sr-only">Open user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/settings">Paramètres</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm">
              <Link href="/login-client">
                  <LogIn className="h-4 w-4 sm:mr-2" />
                  <span className="sr-only sm:not-sr-only">Connexion</span>
              </Link>
          </Button>
        )}

      </nav>
    </header>
  );
}
