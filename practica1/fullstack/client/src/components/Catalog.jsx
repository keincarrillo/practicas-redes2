import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import Filters from '../components/Filters'
import ProductCard from '../components/ProductCard'
import CartDrawer from '../components/CartDrawer'
import { API } from '../api/api.js'

export default function CatalogPage() {
  const [types, setTypes] = useState([])
  const [type, setType] = useState('')
  const [sort, setSort] = useState('relevancia')
  const [query, setQuery] = useState('')
  const [marca, setMarca] = useState('')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState([])
  const [total, setTotal] = useState(0)

  // Tipos (categorías)
  useEffect(() => {
    ;(async () => {
      try {
        const j = await API.get('/api/types')
        setTypes(j?.tipos || [])
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  // Catálogo
  async function loadCatalog() {
    setLoading(true)
    setError('')
    try {
      if (type) {
        const j = await API.get(`/api/by-type/${encodeURIComponent(type)}`)
        setItems(j?.productos || [])
      } else {
        const params = new URLSearchParams()
        if (query.trim()) params.set('nombre', query.trim())
        if (marca.trim()) params.set('marca', marca.trim())
        const j = await API.get(
          `/api/search${params.toString() ? `?${params}` : ''}`
        )
        setItems(j?.resultados || [])
      }
    } catch (e) {
      console.error(e)
      setError('No se pudo cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCatalog()
  }, [])
  useEffect(() => {
    const t = setTimeout(loadCatalog, 200) // debounce simple
    return () => clearTimeout(t)
  }, [type, query, marca, sort])

  // Carrito
  async function refreshCart() {
    try {
      const j = await API.get('/api/cart')
      setCart(j?.carrito || [])
      setTotal(j?.total || 0)
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    refreshCart()
  }, [])

  async function addToCart(sku) {
    try {
      const j = await API.post('/api/cart/add', { sku, cant: 1 })
      if (j?.ok) {
        setCart(j.carrito || [])
        setTotal(j.total || 0)
      }
    } catch {
      alert('No se pudo agregar al carrito')
    }
  }

  async function checkout() {
    const nombre = prompt('Tu nombre para el ticket:', 'Cliente') || 'Cliente'
    try {
      const j = await API.post('/api/checkout', { cliente: { nombre } })
      if (j?.ok && j.ticket) {
        alert(
          `Gracias, ${nombre}!\nOrden: ${j.ticket.orden}\nTotal: ${j.ticket.total}`
        )
        await refreshCart()
        setCartOpen(false)
        await loadCatalog() // actualizar stock
      } else {
        alert(j?.error || 'Error al finalizar compra')
      }
    } catch {
      alert('Error al finalizar compra')
    }
  }

  const cartCount = useMemo(
    () => cart.reduce((a, i) => a + (i.cant || 0), 0),
    [cart]
  )

  const shown = useMemo(() => {
    const arr = [...items]
    if (sort === 'precio-asc')
      arr.sort((a, b) => (a.precio ?? 0) - (b.precio ?? 0))
    if (sort === 'precio-desc')
      arr.sort((a, b) => (b.precio ?? 0) - (a.precio ?? 0))
    if (sort === 'nombre')
      arr.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
    return arr
  }, [items, sort])

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
