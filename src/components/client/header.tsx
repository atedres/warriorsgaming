import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "../logo";
import { ThemeToggle } from "../theme-toggle";

export default function ClientHeader() {
  return (
    <header className="px-4 lg:px-6 h-14 flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b">
      <Link href="/" className="flex items-center justify-center">
        <Logo />
        <span className="sr-only">Warriors Gaming</span>
      </Link>
      <nav className="ml-auto flex items-center gap-4 sm:gap-6">
        <ThemeToggle />
        <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
          <Link
            href="/admin"
            className="text-sm font-medium"
          >
            Admin Panel
          </Link>
        </Button>
      </nav>
    </header>
  );
}
