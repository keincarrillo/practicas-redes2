const Header = ({
  cartCount,
  onOpenCart,
  query,
  setQuery,
  marca,
  setMarca
}) => {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600" />
          <span className="font-bold text-lg">Socking</span>
        </div>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre"
            className="w-full rounded-xl border px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            value={marca}
            onChange={e => setMarca(e.target.value)}
            placeholder="Marca"
            className="w-40 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={onOpenCart}
            className="relative rounded-xl border px-3 py-2 hover:shadow"
          >
            🛒 Carrito
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 text-xs bg-purple-600 text-white rounded-full px-2 py-0.5">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
