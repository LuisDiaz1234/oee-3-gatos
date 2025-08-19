export const metadata = {
  title: "OEE 3 Gatos",
  description: "Panel de OEE, Mantenimiento e Inventario",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-6xl p-6">
          <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold">3 Gatos Cervecería — OEE &amp; Mantenimiento</h1>
            <nav className="space-x-2 text-sm">
              <a className="px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-100" href="/">Dashboard</a>
              <a className="px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-100" href="/mantenimiento">Mantenimientos</a>
              <a className="px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-100" href="/inventario">Inventario</a>
              <a className="px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-100" href="/recetas">Recetas</a>
              <a className="px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-100" href="/produccion">Producción</a>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="mt-10 text-xs text-gray-500">v0.1</footer>
        </div>
      </body>
    </html>
  );
}
