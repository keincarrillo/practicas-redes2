import Header from '../components/Header'
import Filters from '../components/Filters'
import ProductCard from '../components/ProductCard'
import CartDrawer from '../components/CartDrawer'
import { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'

export default function CatalogPage() {
  const {
    cartCount,
    error,
    loading,
    shown,
    types,
    type,
    setType,
    sort,
    setSort,
    query,
    setQuery,
    marca,
    setMarca,
    cartOpen,
    setCartOpen,
    cart,
    addToCart,
    checkout,
    total
  } = useContext(ShopContext)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <Header
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        query={query}
        setQuery={setQuery}
        marca={marca}
        setMarca={setMarca}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Catálogo</h1>
          <p className="text-gray-600">
            Explora el inventario del servidor y agrega al carrito.
          </p>
        </div>

        <Filters
          types={types}
          type={type}
          setType={setType}
          sort={sort}
          setSort={setSort}
          onClear={() => {
            setType('')
            setQuery('')
            setMarca('')
            setSort('relevancia')
          }}
        />

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border text-red-700 mb-4">
            {error}
          </div>
        )}
        {loading && (
          <div className="p-3 rounded-xl bg-white border mb-4">Cargando…</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {shown.map(p => (
            <ProductCard key={p.sku} p={p} onAdd={addToCart} />
          ))}
        </div>

        {!loading && shown.length === 0 && (
          <div className="text-center text-gray-500 py-20">
            No se encontraron productos.
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-10 text-center text-gray-500">
        Front React + Tailwind conectado a Proxy HTTP → Servidor TCP Python.
      </footer>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        total={total}
        onCheckout={checkout}
      />
    </div>
  )
}
