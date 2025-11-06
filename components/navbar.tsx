"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/github.png";
import { useUser } from "@/hooks/use-user";
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
import { FaArrowRight, FaGithub, FaMoon, FaPowerOff, FaSun } from "react-icons/fa6";

export function Navbar() {
  const { user, loading } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="w-full py-5 px-10 flex justify-between items-center bg-background">
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

        {loading ? (
          <span className="opacity-50">/loading...</span>
        ) : (
          user && (
            <>
              <span className="opacity-70 text-xs ml-2">/{user.user_metadata?.user_name || user.email}</span>
            </>
          )
        )}
      </Link>

      <div className="flex items-center gap-8 text-xs">
        <Link
          href="/docs"
          className="hover:underline"
        >
          /docs
        </Link>

        <Link
          href="/leaderboard"
          className="hover:underline"
        >
          /leaderboard
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
              className="bg-foreground text-background p-2 rounded-md shadow-md mt-1 w-32 text-center gap-2 border-none"
            >
              <DropdownMenuItem
                className="flex flex-row items-center gap-2 justify-between hover:cursor-pointer hover:bg-secondary/20 hover:border-none p-2"
                onClick={toggleTheme}
              >
                {theme === "dark" ? <FaSun /> : <FaMoon />}
                {theme === "dark" ? "light mode" : "dark mode"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex flex-row items-center gap-2 justify-between hover:cursor-pointer hover:bg-secondary/20 hover:border-none p-2"
                onClick={handleLogout}
              >
                <FaPowerOff />
                logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            className="flex flex-row items-center gap-1.5 hover:cursor-pointer px-3 py-0.5"
            variant={"secondary"}
          >
            <FaArrowRight />
            <p className="text-[10px]">/entrar</p>
          </Button>
        )}
      </div>
    </nav>
  );
}
