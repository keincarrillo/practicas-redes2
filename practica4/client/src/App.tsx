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
    iframeRef,
    method,
    setMethod,
    endpoint,
    setEndpoint,
    isLoading,
    response,
    error,
    viewMode,
    setViewMode,
    getStatusColor,
    getStatusBg,
    shouldRenderContent,
    handleSend,
  } = ctx

  const renderContent = () => {
    if (!response) return null

    const canRender = shouldRenderContent(response.contentType)

    return (
      <div className="space-y-4">
        <div
          className={`p-4 border-2 rounded-lg ${getStatusBg(response.status)}`}
        >
          <p className={`font-bold text-lg ${getStatusColor(response.status)}`}>
            Status: {response.status}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Content-Type: {response.contentType || 'N/A'}
          </p>
        </div>

        {canRender && (
          <div className="flex gap-2 border-b-2 border-gray-200">
            <button
              onClick={() => setViewMode('rendered')}
              className={`px-4 py-2 font-medium transition-colors ${
                viewMode === 'rendered'
                  ? 'text-pixie-green-600 border-b-2 border-pixie-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Vista Renderizada
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-4 py-2 font-medium transition-colors ${
                viewMode === 'raw'
                  ? 'text-pixie-green-600 border-b-2 border-pixie-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Código Fuente
            </button>
          </div>
        )}

        {canRender && viewMode === 'rendered' ? (
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
              <div className="flex items-center gap-2">
                {response.contentType.includes('html') ? (
                  <>
                    <span className="text-orange-500">●</span>
                    <span className="text-sm font-medium text-gray-700">
                      HTML Renderizado
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-blue-500">●</span>
                    <span className="text-sm font-medium text-gray-700">
                      XML Renderizado
                    </span>
                  </>
                )}
              </div>
            </div>
            <iframe
              ref={iframeRef}
              title="Rendered Content"
              className="w-full h-96 bg-white"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        ) : (
          <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
              <span className="text-gray-500">●</span>
              <span className="text-sm font-medium text-gray-700">
                Source Code
              </span>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-800 max-h-96 overflow-y-auto whitespace-pre-wrap break-words">
              {response.body}
            </pre>
          </div>
        )}
      </div>
    )
  }

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
            HTTP Cliente
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
              🔗 URL base: {BASE_URL}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">❌</span>
                <div className="flex-1">
                  <p className="font-bold text-red-700 mb-2">
                    Error de Conexión
                  </p>
                </div>
              </div>
            </div>
          )}

          {response && renderContent()}

          {!response && !error && !isLoading && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🚀</div>
              <p className="text-gray-500 font-medium">
                Presiona "Enviar" para hacer una peticion
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Prueba con /html o /xml para ver contenido renderizado
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
