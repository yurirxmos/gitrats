"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";

export default function DebugPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [characterResult, setCharacterResult] = useState<any>(null);
  const [userResult, setUserResult] = useState<any>(null);
  const [leaderboardResult, setLeaderboardResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const supabase = createClient();

    // 1. Verificar sessão
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    setSessionInfo({
      hasSession: !!sessionData.session,
      hasToken: !!sessionData.session?.access_token,
      tokenPreview: sessionData.session?.access_token?.substring(0, 15) + "...",
      user: sessionData.session?.user,
      error: sessionError?.message,
    });

    const token = sessionData.session?.access_token;

    // 2. Testar /api/character
    try {
      const res = await fetch("/api/character", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setCharacterResult({
        status: res.status,
        ok: res.ok,
        data: data,
      });
    } catch (e: any) {
      setCharacterResult({
        error: e.message,
      });
    }

    // 3. Testar /api/user
    try {
      const res = await fetch("/api/user", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setUserResult({
        status: res.status,
        ok: res.ok,
        data: data,
      });
    } catch (e: any) {
      setUserResult({
        error: e.message,
      });
    }

    // 4. Testar /api/leaderboard/[userId]
    if (sessionData.session?.user?.id) {
      try {
        const res = await fetch(`/api/leaderboard/${sessionData.session.user.id}`);
        const data = await res.json();
        setLeaderboardResult({
          status: res.status,
          ok: res.ok,
          data: data,
        });
      } catch (e: any) {
        setLeaderboardResult({
          error: e.message,
        });
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-8 py-12 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">/debug</h1>
          <Button
            onClick={runTests}
            disabled={loading}
          >
            {loading ? "Testando..." : "Executar Testes"}
          </Button>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent>
              <h2 className="font-bold text-lg mb-2">1. Sessão Supabase</h2>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto">{JSON.stringify(sessionInfo, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="font-bold text-lg mb-2">2. GET /api/character</h2>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                {JSON.stringify(characterResult, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="font-bold text-lg mb-2">3. GET /api/user</h2>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto">{JSON.stringify(userResult, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="font-bold text-lg mb-2">4. GET /api/leaderboard/[userId]</h2>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                {JSON.stringify(leaderboardResult, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="font-bold text-lg mb-2">Instruções</h2>
              <ul className="text-sm space-y-2">
                <li>• Se "hasSession" for false → faça logout e login novamente</li>
                <li>• Se "hasToken" for false → sessão expirada, refaça login</li>
                <li>• Se status != 200 → veja o erro retornado pela API</li>
                <li>• Se data estiver vazio → problema no banco ou RLS policies</li>
                <li>
                  • Abra o DevTools Console para ver logs com prefixo <code>[UserProvider]</code>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
