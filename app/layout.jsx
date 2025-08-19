import "./globals.css";
import Topbar from "../components/Topbar";

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
            <h1 className="text-2xl font-bold">
              3 Gatos Cervecería — OEE &amp; Mantenimiento
            </h1>
            <Topbar />
          </header>
          <main>{children}</main>
          <footer className="mt-10 text-xs text-gray-500">v0.1</footer>
        </div>
      </body>
    </html>
  );
}
