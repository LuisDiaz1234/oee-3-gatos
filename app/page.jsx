export default function Page() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">OEE</h2>
        <p className="text-sm text-gray-600">Aquí verás Availability, Performance, Quality y OEE.</p>
      </section>
      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Mantenimientos</h2>
        <p className="text-sm text-gray-600">Programados, en proceso y completados.</p>
      </section>
      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Inventario</h2>
        <p className="text-sm text-gray-600">Stock actual y alertas por mínimos.</p>
      </section>
    </div>
  );
}
