import { mxn } from '../utils/money'

const placeholderImg = seed =>
  `https://picsum.photos/seed/${encodeURIComponent(seed || Math.random())}/200/200`

export default function CartDrawer({ open, onClose, cart, total, onCheckout }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      )}
      <aside
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Tu carrito</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {!cart || cart.length === 0 ? (
            <p className="text-gray-500">No hay productos en el carrito.</p>
          ) : (
            cart.map((it, idx) => (
              <div
                key={idx}
                className="flex gap-3 border rounded-xl p-3 items-center"
              >
                <img
                  src={placeholderImg(it.sku)}
                  alt={it.nombre}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      {it.nombre}{' '}
                      <span className="text-xs text-gray-500">({it.sku})</span>
                    </h4>
                    <span className="font-semibold">
                      {mxn.format(it.total_linea)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {mxn.format(it.precio)} c/u · Cant: {it.cant}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">{mxn.format(total || 0)}</span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full rounded-xl bg-purple-600 text-white py-3 hover:bg-purple-700"
          >
            Finalizar compra
          </button>
        </div>
      </aside>
    </>
  )
}
