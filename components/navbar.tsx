"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/github.png";
import { useUserContext } from "@/contexts/user-context";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/theme-context";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Button } from "./ui/button";
import { DropdownMenuLabel, DropdownMenuSeparator } from "./ui/dropdown-menu";
import {
  FaArrowRight,
  FaBars,
  FaFileCode,
  FaGear,
  FaGears,
  FaGithub,
  FaMoon,
  FaPaperPlane,
  FaPowerOff,
  FaSun,
  FaTrophy,
  FaUsers,
  FaXmark,
} from "react-icons/fa6";

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

  // Prefetch de rotas comuns para melhorar a navegação em dev
  useEffect(() => {
    router.prefetch("/leaderboard");
    router.prefetch("/configs");
    router.prefetch("/docs");
  }, [router]);

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
      <nav className="w-full py-5 px-4 sm:px-10 flex justify-between items-center bg-background relative">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1"
        >
          <Image
            src={logo}
            alt="Gitrats Logo"
            className="w-5 h-5 dark:invert"
          />
          <h1 className="text-lg font-black uppercase">Gitrats</h1>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-xs">
          <Link
            href="/docs"
            className="flex flex-row items-center gap-2 hover:underline"
          >
            <FaFileCode />
            /docs
          </Link>
          <Link
            href="/reports"
            className="flex flex-row items-center gap-2 hover:underline"
          >
            <FaPaperPlane />
            /reports
          </Link>

          <Link
            href="/leaderboard"
            className="flex flex-row items-center gap-2 hover:underline"
          >
            <FaTrophy />
            /leaderboard
          </Link>

          <Link
            href="/guild"
            className="flex flex-row items-center gap-2 hover:underline"
          >
            <FaUsers />
            /guild
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="flex flex-row items-center gap-1.5 hover:cursor-pointer px-3 py-0.5"
                  variant={"secondary"}
                >
                  <p className="text-[10px]">{user.user_metadata?.user_name || user.email}</p>
                  <Avatar className="w-5 h-5">
                    <img
                      src={user.user_metadata?.avatar_url || "/default-avatar.png"}
                      alt="User Avatar"
                    />
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-foreground text-background p-1 rounded-md shadow-md mt-1 w-32 text-center gap-2 border-none"
              >
                <DropdownMenuItem
                  className="flex flex-row items-center gap-2 justify-between hover:cursor-pointer hover:bg-secondary/20 hover:border-none rounded-sm p-2"
                  onClick={() => router.push("/configs")}
                >
                  <FaGear />
                  configs
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex flex-row items-center gap-2 justify-between hover:cursor-pointer hover:bg-secondary/20 hover:border-none rounded-sm p-2"
                  onClick={toggleTheme}
                >
                  {theme === "dark" ? <FaSun /> : <FaMoon />}
                  {theme === "dark" ? "light mode" : "dark mode"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex flex-row items-center gap-2 justify-between hover:cursor-pointer hover:bg-secondary/20 hover:border-none rounded-sm p-2"
                  onClick={handleLogout}
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
              <FaArrowRight />
              <p className="text-[10px]">/entrar</p>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 hover:bg-secondary/20 rounded-md"
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
