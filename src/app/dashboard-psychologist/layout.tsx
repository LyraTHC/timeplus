
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Home,
  Users,
  Settings,
  LogOut,
  Menu,
  Calendar,
  DollarSign,
  LifeBuoy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPsychologistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isFirebaseConfigured && !loading) {
      if (!user) {
        // If not logged in, redirect to home page
        router.push("/");
      } else if (userData && userData.role !== 'Psicólogo') {
        // If logged in but not a psychologist, redirect to home page
        toast({
          variant: "destructive",
          title: "Acesso Negado",
          description: "Você não tem permissão para acessar esta página.",
        });
        router.push('/');
      }
    }
  }, [user, userData, loading, router, toast]);
  
  const handleLogout = async () => {
    if (isFirebaseConfigured) {
      await auth?.signOut();
    }
    router.push("/");
  };


  const navLinks = [
    { href: "/dashboard-psychologist", label: "Painel", icon: Home },
    { href: "/dashboard-psychologist/agenda", label: "Agenda", icon: Calendar },
    { href: "/dashboard-psychologist/pacientes", label: "Pacientes", icon: Users },
    { href: "/dashboard-psychologist/finance", label: "Financeiro", icon: DollarSign },
    { href: "/dashboard-psychologist/support", label: "Suporte", icon: LifeBuoy },
    { href: "/dashboard-psychologist/settings", label: "Configurações", icon: Settings },
  ];

  if (loading || (isFirebaseConfigured && user && !userData)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const displayName = userData?.name || 'Psicólogo(a)';
  const displayInitials = displayName?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'PS';

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-20 items-center justify-center border-b px-4 lg:h-24 lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold w-full px-4">
              <Logo />
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    (pathname === link.href || (link.href !== "/dashboard-psychologist" && pathname.startsWith(link.href))) &&
                      "bg-muted text-primary"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Button size="sm" className="w-full" variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Alternar menu de navegação</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 text-lg font-semibold mb-4"
                >
                  <Logo />
                  <span className="sr-only">TimePlus</span>
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                      (pathname === link.href || (link.href !== "/dashboard-psychologist" && pathname.startsWith(link.href))) &&
                        "bg-muted text-foreground"
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto">
                <Button size="sm" className="w-full" variant="outline" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Can add a search bar here if needed */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage
                    src={userData?.avatarUrl}
                    alt={displayName}
                    data-ai-hint="woman psychologist"
                  />
                  <AvatarFallback>{displayInitials}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Alternar menu de usuário</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard-psychologist/settings">Configurações</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                  <Link href="/dashboard-psychologist/support">Suporte</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ThemeToggle />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
