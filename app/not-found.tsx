import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-xl opacity-70">página-não-encontrada</p>
        
        <Link
          href={"/"}
          className="text-primary text-xs hover:underline"
        >
          /voltar
        </Link>
      </div>
    </div>
  );
}
