"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/github.png";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/theme-context";

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
    <nav className="w-full py-5 px-10 flex justify-between items-center">
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

      <div className="flex items-center gap-10 text-xs">
        <button
          onClick={toggleTheme}
          className="hover:underline hover:cursor-pointer"
        >
          /{theme === "dark" ? "light-mode" : "dark-mode"}
        </button>

        <Link
          href="/leaderboard"
          className="hover:underline"
        >
          /leaderboard
        </Link>

        {loading ? (
          <span className="opacity-50">/loading...</span>
        ) : user ? (
          <>
            <button
              onClick={handleLogout}
              className="hover:underline hover:cursor-pointer"
            >
              /logout
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            className="hover:underline hover:cursor-pointer"
          >
            /login
          </button>
        )}
      </div>
    </nav>
  );
}
