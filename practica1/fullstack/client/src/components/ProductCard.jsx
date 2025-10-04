import { mxn } from '../utils/money'

const placeholderImg = seed =>
  `https://picsum.photos/seed/${encodeURIComponent(seed || Math.random())}/600/400`

export default function ProductCard({ p, onAdd }) {
  const stock = p.stock ?? 0
  return (
    <div className="border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={placeholderImg(p.sku)}
          alt={p.nombre}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{p.nombre}</h3>
          <span className="font-bold">{mxn.format(p.precio)}</span>
        </div>

        <div className="text-sm text-gray-600">{p.descripcion}</div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-amber-600">
            {'★'.repeat(Math.round(p.calificacion || 4))}
          </span>
          <span className="text-gray-500">{p.subcategoria || p.categoria}</span>
        </div>

        <button
          onClick={() => onAdd(p.sku)}
          className="w-full rounded-xl bg-purple-600 text-white py-2 hover:bg-purple-700 disabled:opacity-50"
          disabled={stock <= 0}
        >
          {stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
        </button>
      </div>
    </div>
  )
}
