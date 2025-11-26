"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/github.png";
import { useUserContext } from "@/contexts/user-context";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/theme-context";
import { Avatar } from "./ui/avatar";
import { useGuild } from "@/hooks/use-guild";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  FaBars,
  FaBug,
  FaFileCode,
  FaGear,
  FaGithub,
  FaLaptopCode,
  FaMoon,
  FaPaperPlane,
  FaPowerOff,
  FaSun,
  FaTrophy,
  FaUsers,
  FaXmark,
} from "react-icons/fa6";
import { HelpCircleIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function Navbar() {
  const { user, loading } = useUserContext();
  const router = useRouter();
  // Criar o client de forma lazily no estado para evitar exceptions em render
  const [supabase, setSupabase] = useState(() => {
    try {
      return createClient();
    } catch (e) {
      console.error("[NAVBAR] Falha ao instanciar supabase client", e);
      return null;
    }
  });
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { invites } = useGuild();
  const hasGuildInvite = invites && invites.length > 0;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogin = async () => {
    try {
      const client = supabase ?? createClient();
      await client.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch (e) {
      console.error("[NAVBAR] Erro ao iniciar o login", e);
    }
  };

  const handleLogout = async () => {
    try {
      const client = supabase ?? createClient();
      await client.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error("[NAVBAR] Erro ao deslogar", e);
    }
  };

  return (
    <>
      <nav className="w-full py-2 px-4 sm:px-10 flex items-center bg-background/20 backdrop-blur-sm z-50 fixed">
        <div>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant={"ghost"}
                size={"icon"}
                className=""
                onClick={() => router.push("/docs")}
              >
                <HelpCircleIcon />{" "}
              </Button>
            </TooltipTrigger>

            <TooltipContent>
              <p>Ajuda</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Logo */}
        <Link
          href="/leaderboard"
          className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2"
        >
          <Image
            src={logo}
            alt="Gitrats Logo"
            className="w-5 h-5 dark:invert"
          />
          <h1 className="text-lg font-black uppercase">Gitrats</h1>
          <Badge className="ml-1 text-[10px] px-1 py-0">BETA</Badge>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-xs flex-1 justify-end">
          {user ? (
            <DropdownMenu onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  className="flex flex-row items-center gap-1.5 hover:cursor-pointer px-3 py-0.5"
                  variant={"secondary"}
                >
                  <p className="text-[10px]">{user.user_metadata?.user_name || user.email}</p>
                  <span className="relative inline-flex">
                    <Avatar className="w-5 h-5">
                      <img
                        src={user.user_metadata?.avatar_url || "/default-avatar.png"}
                        alt="User Avatar"
                      />
                    </Avatar>
                    {hasGuildInvite && (
                      <span className="absolute -top-0.5 -right-0.5 block h-2 w-2 rounded-full bg-red-500 animate-pulse ring-1 ring-background" />
                    )}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-foreground text-background p-1 rounded-md shadow-md mt-1 w-40 gap-2 border-none"
              >
                <DropdownMenuItem onClick={() => router.push("/leaderboard")}>
                  <FaTrophy />
                  leaderboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/guild")}>
                  <FaUsers className={hasGuildInvite && menuOpen ? "text-red-500 animate-pulse" : ""} />
                  guild
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/reports")}>
                  <FaBug />
                  reports
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/docs")}>
                  <FaFileCode />
                  docs
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-secondary/10" />
                <DropdownMenuItem onClick={() => router.push("/configs")}>
                  <FaGear />
                  configs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "dark" ? <FaSun /> : <FaMoon />}
                  theme
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  variant="destructive"
                >
                  <FaPowerOff />
                  logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={handleLogin}
              className="flex flex-row items-center gap-1.5 hover:cursor-pointer px-3 py-0.5"
              variant={"secondary"}
            >
              <FaLaptopCode />
              <p className="text-[10px]">/entrar</p>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 hover:bg-secondary/20 rounded-md flex-1 flex justify-end"
        >
          {mobileMenuOpen ? <FaXmark className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <div className="flex flex-col gap-4 p-4">
            <Link
              href="/docs"
              className="flex flex-row items-center gap-2 hover:underline text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaFileCode />
              /docs
            </Link>
            <Link
              href="/reports"
              className="flex flex-row items-center gap-2 hover:underline text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaPaperPlane />
              /reports
            </Link>
            <Link
              href="/leaderboard"
              className="flex flex-row items-center gap-2 hover:underline text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaTrophy />
              /leaderboard
            </Link>
            <Link
              href="/guild"
              className="flex flex-row items-center gap-2 hover:underline text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaUsers />
              /guild
            </Link>

            {user ? (
              <>
                <div className="flex items-center gap-2 py-2 border-t border-border">
                  <Avatar className="w-8 h-8">
                    <img
                      src={user.user_metadata?.avatar_url || "/default-avatar.png"}
                      alt="User Avatar"
                    />
                  </Avatar>
                  <span className="text-sm">{user.user_metadata?.user_name || user.email}</span>
                </div>
                <Button
                  onClick={() => {
                    router.push("/configs");
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="flex items-center gap-2 justify-center w-full"
                >
                  <FaGear />
                  Configs
                </Button>
                <Button
                  onClick={toggleTheme}
                  variant="outline"
                  className="flex items-center gap-2 justify-center w-full"
                >
                  {theme === "dark" ? <FaSun /> : <FaMoon />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </Button>
                <Button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  variant="destructive"
                  className="flex items-center gap-2 justify-center w-full"
                >
                  <FaPowerOff />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  handleLogin();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 justify-center w-full"
                variant="secondary"
              >
                <FaGithub />
                Entrar com GitHub
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
