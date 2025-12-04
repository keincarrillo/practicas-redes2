import { createContext, useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import type { HttpMethod } from '../types/htttpType'
import type { ApiResult } from '../types/apiType'
import { BASE_URL } from '../config/config'

import type {
  PfProviderProps,
  PfContextValue,
  ViewMode,
} from '../types/contextType'

export const PfContext = createContext<PfContextValue | null>(null)

export const PfProvider = ({ children }: PfProviderProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const [method, setMethod] = useState<HttpMethod>('GET')
  const [endpoint, setEndpoint] = useState('/texto')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<ApiResult | null>(null)
  const [error, setError] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('rendered')

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(containerRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      })

      gsap.from(titleRef.current, {
        x: -30,
        opacity: 0,
        duration: 0.6,
        delay: 0.2,
        ease: 'power2.out',
      })
    })

    return () => ctx.revert()
  }, [])

  // Efecto para renderizar contenido en el iframe
  useEffect(() => {
    if (response && iframeRef.current && viewMode === 'rendered') {
      const iframe = iframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

      if (iframeDoc) {
        iframeDoc.open()

        // Si es XML, lo renderizamos con estilos para mejor visualización
        if (response.contentType.includes('xml')) {
          const styledXml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body {
                    font-family: 'Consolas', 'Monaco', monospace;
                    padding: 20px;
                    background: #f8f9fa;
                    margin: 0;
                  }
                  pre {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow-x: auto;
                    line-height: 1.6;
                  }
                  .xml-tag { color: #0066cc; font-weight: bold; }
                  .xml-attr { color: #994500; }
                  .xml-value { color: #009900; }
                  .xml-comment { color: #808080; font-style: italic; }
                  .xml-declaration { color: #990099; }
                </style>
              </head>
              <body>
                <pre>${formatXml(response.body)}</pre>
              </body>
            </html>
          `
          iframeDoc.write(styledXml)
        } else {
          // Para HTML, lo renderizamos directamente
          iframeDoc.write(response.body)
        }

        iframeDoc.close()
      }
    }
  }, [response, viewMode])

  const handleSend = async () => {
    setIsLoading(true)
    setError('')
    setResponse(null)

    try {
      const finalPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
      const fullUrl = `${BASE_URL}${finalPath}`

      console.log('🚀 Enviando petición:', { method, url: fullUrl })

      const res = await fetch(fullUrl, {
        method,
        headers:
          method === 'GET'
            ? {}
            : {
                'Content-Type': 'text/plain; charset=utf-8',
              },
      })

      console.log('✅ Respuesta recibida:', {
        status: res.status,
        contentType: res.headers.get('content-type'),
      })

      const contentType = res.headers.get('content-type') ?? ''
      let bodyText: string

      if (contentType.includes('application/json')) {
        const json = await res.json()
        bodyText = JSON.stringify(json, null, 2)
      } else {
        bodyText = await res.text()
      }

      setResponse({
        status: res.status,
        contentType,
        body: bodyText,
      })
    } catch (err) {
      console.error('❌ Error en la petición:', err)

      let errorMessage = 'Error al conectar con el servidor'

      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = `No se pudo conectar a ${BASE_URL}. 
        
Verifica que:
• El servidor Java esté corriendo en el puerto 8080
• No hay firewall bloqueando la conexión
• La URL es correcta: ${BASE_URL}`
      } else if (err instanceof Error) {
        errorMessage = err.message
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600'
    if (status >= 300 && status < 400) return 'text-blue-600'
    if (status >= 400 && status < 500) return 'text-orange-600'
    return 'text-red-600'
  }

  const getStatusBg = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-50 border-green-200'
    if (status >= 300 && status < 400) return 'bg-blue-50 border-blue-200'
    if (status >= 400 && status < 500) return 'bg-orange-50 border-orange-200'
    return 'bg-red-50 border-red-200'
  }

  const shouldRenderContent = (contentType: string) => {
    return (
      contentType.includes('text/html') ||
      contentType.includes('application/xml') ||
      contentType.includes('text/xml')
    )
  }

  // Función para formatear y resaltar XML
  const formatXml = (xml: string): string => {
    // Escapa caracteres HTML
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    const escaped = escapeHtml(xml)

    // Resalta la sintaxis XML
    return (
      escaped
        // Declaración XML
        .replace(
          /(&lt;\?xml[^?]*\?&gt;)/g,
          '<span class="xml-declaration">$1</span>'
        )
        // Comentarios
        .replace(
          /(&lt;!--[\s\S]*?--&gt;)/g,
          '<span class="xml-comment">$1</span>'
        )
        // Tags de apertura y cierre
        .replace(/(&lt;\/?[\w-]+)/g, '<span class="xml-tag">$1</span>')
        // Atributos
        .replace(/([\w-]+)=/g, '<span class="xml-attr">$1</span>=')
        // Valores de atributos
        .replace(
          /=(&quot;[^&quot;]*&quot;|&#039;[^&#039;]*&#039;)/g,
          '=<span class="xml-value">$1</span>'
        )
        // Cierre de tags
        .replace(/(\/?&gt;)/g, '<span class="xml-tag">$1</span>')
    )
  }

  return (
    <PfContext.Provider
      value={{
        containerRef,
        titleRef,
        iframeRef,
        method,
        setMethod,
        endpoint,
        setEndpoint,
        isLoading,
        setIsLoading,
        response,
        setResponse,
        error,
        setError,
        viewMode,
        setViewMode,
        getStatusColor,
        getStatusBg,
        shouldRenderContent,
        handleSend,
      }}
    >
      {children}
    </PfContext.Provider>
  )
}
