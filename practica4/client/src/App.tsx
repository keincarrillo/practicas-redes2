import { useContext } from 'react'
import { PfContext } from './context/Context'
import { BASE_URL } from './config/config'
import type { HttpMethod } from './types/htttpType'

const App = () => {
  const ctx = useContext(PfContext)

  if (!ctx) {
    throw new Error('App debe estar envuelta por PfProvider')
  }

  const {
    containerRef,
    titleRef,
    method,
    setMethod,
    endpoint,
    setEndpoint,
    isLoading,
    response,
    error,
    getStatusColor,
    getStatusBg,
    handleSend,
  } = ctx

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixie-green-50 via-pixie-green-100 to-pixie-green-200 p-6">
      <div
        ref={containerRef}
        className="max-w-5xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="bg-pixie-green-600 px-6 py-4">
          <h1
            ref={titleRef}
            className="text-2xl font-bold text-white flex items-center gap-3"
          >
            HTTP Client
          </h1>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Peticion HTTP
            </label>

            <div className="flex gap-2">
              <select
                value={method}
                onChange={e => setMethod(e.target.value as HttpMethod)}
                className="px-4 py-2.5 border-2 border-pixie-green-300 rounded-lg font-semibold text-pixie-green-700 bg-white hover:border-pixie-green-400 focus:outline-none focus:ring-2 focus:ring-pixie-green-300 cursor-pointer transition-colors"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>

              <input
                type="text"
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                placeholder="/texto, /html, /json, /xml"
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-pixie-green-500 focus:outline-none focus:ring-2 focus:ring-pixie-green-200 transition-all"
              />

              <button
                onClick={handleSend}
                disabled={isLoading}
                className="px-8 py-2.5 bg-pixie-green-600 hover:bg-pixie-green-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-pixie-green-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              URL base: {BASE_URL}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {response && (
            <div className="space-y-4">
              <div
                className={`p-4 border-2 rounded-lg ${getStatusBg(
                  response.status
                )}`}
              >
                <p className={getStatusColor(response.status)}>
                  {response.status}
                </p>
                <p>{response.contentType || 'N/A'}</p>
              </div>

              <div>
                <pre className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg overflow-x-auto text-sm font-mono text-gray-800 max-h-96 overflow-y-auto">
                  {response.body}
                </pre>
              </div>
            </div>
          )}

          {!response && !error && !isLoading && (
            <div className="text-center py-16">
              <p className="text-gray-500 font-medium">
                Presiona "Enviar" para hacer una peticion
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
