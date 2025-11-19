export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-xl opacity-70">Página não encontrada</p>
        <a
          href="/"
          className="text-primary hover:underline"
        >
          Voltar para o início
        </a>
      </div>
    </div>
  );
}
