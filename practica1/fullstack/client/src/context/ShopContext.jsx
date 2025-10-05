import { createContext, useState, useEffect, useMemo } from 'react'
import { API } from '../api/api.js'

export const ShopContext = createContext()

export const ShopProvider = ({ children }) => {
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

  // Carga los tipos la primera vez que se carga el componente
  useEffect(() => {
    ;(async () => {
      try {
        const json = await API.get('/api/types')
        setTypes(json?.tipos || [])
      } catch (error) {
        console.error(error)
      }
    })()
  }, [])

  // Carga el catalogo
  const loadCatalog = async () => {
    setLoading(true)
    setError('')
    try {
      if (type) {
        const json = await API.get(`/api/by-type/${encodeURIComponent(type)}`)
        setItems(json?.productos || [])
      } else {
        const params = new URLSearchParams()
        if (query.trim()) params.set('nombre', query.trim())
        if (marca.trim()) params.set('marca', marca.trim())
        const json = await API.get(
          `/api/search${params.size ? `?${params.toString()}` : ''}`
        )
        setItems(json?.resultados || [])
      }
    } catch (error) {
      console.error(error)
      setError('No se pudo cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  // Carga el catalogo al renderizar el componente
  useEffect(() => {
    loadCatalog()
  }, [])

  useEffect(() => {
    const t = setTimeout(loadCatalog, 100) // Hace la animacion de carga
    return () => clearTimeout(t) // Limpia el timeout
  }, [type, query, marca, sort]) // Depende de estas variables la condicion de recarga

  // Carrito
  async function refreshCart() {
    try {
      const json = await API.get('/api/cart')
      setCart(json?.carrito || [])
      setTotal(json?.total || 0)
    } catch (e) {
      console.error(e)
    }
  }

  // Carga el carrito al renderizar el componente
  useEffect(() => {
    refreshCart()
  }, [])

  // Agrega un producto al carrito
  async function addToCart(sku) {
    try {
      const json = await API.post('/api/cart/add', { sku, cant: 1 })
      if (json?.ok) {
        setCart(json.carrito || [])
        setTotal(json.total || 0)
      }
    } catch {
      alert('No se pudo agregar al carrito')
    }
  }

  // Finaliza la compra
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

  // Cantidad de productos en el carrito, se usa useMemo para optimizar, no se vuelve a calcular
  const cartCount = useMemo(
    () => cart.reduce((a, i) => a + (i.cant || 0), 0),
    [cart]
  )

  // Productos mostrados
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
    <>
      <ShopContext.Provider
        value={{
          types,
          type,
          sort,
          items,
          loading,
          error,
          cartOpen,
          cart,
          total,
          cartCount,
          shown,
          setTypes,
          setType,
          setSort,
          setQuery,
          setMarca,
          setItems,
          setLoading,
          setError,
          setCartOpen,
          setCart,
          setTotal,
          addToCart,
          checkout
        }}
      >
        {children}
      </ShopContext.Provider>
    </>
  )
}
