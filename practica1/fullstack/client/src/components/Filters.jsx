export default function Filters({
  types,
  type,
  setType,
  sort,
  setSort,
  onClear
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
      <select
        value={type}
        onChange={e => setType(e.target.value)}
        className="rounded-xl border px-3 py-2"
      >
        <option value="">Todas las categorías</option>
        {types.map(t => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        value={sort}
        onChange={e => setSort(e.target.value)}
        className="rounded-xl border px-3 py-2"
      >
        <option value="relevancia">Orden: Relevancia</option>
        <option value="precio-asc">Precio: Bajo a Alto</option>
        <option value="precio-desc">Precio: Alto a Bajo</option>
        <option value="nombre">Nombre (A-Z)</option>
      </select>

      <button
        onClick={onClear}
        className="rounded-xl border px-3 py-2 text-gray-700 hover:bg-gray-50"
      >
        Limpiar filtros
      </button>
    </div>
  )
}
