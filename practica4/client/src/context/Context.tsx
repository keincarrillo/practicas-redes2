import { createContext, useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import type { HttpMethod } from '../types/htttpType'
import type { ApiResult } from '../types/apiType'
import { BASE_URL } from '../config/config'

import type { PfProviderProps, PfContextValue } from '../types/contextType'

export const PfContext = createContext<PfContextValue | null>(null)

export const PfProvider = ({ children }: PfProviderProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement | null>(null)

  const [method, setMethod] = useState<HttpMethod>('GET')
  const [endpoint, setEndpoint] = useState('/texto')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<ApiResult | null>(null)
  const [error, setError] = useState<string>('')

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

  const handleSend = async () => {
    setIsLoading(true)
    setError('')
    setResponse(null)

    try {
      const finalPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

      const res = await fetch(`${BASE_URL}${finalPath}`, {
        method,
        headers:
          method === 'GET'
            ? {}
            : {
                'Content-Type': 'text/plain; charset=utf-8',
              },
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
      setError(
        err instanceof Error ? err.message : 'Error al conectar con el servidor'
      )
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
  return (
    <PfContext.Provider
      value={{
        containerRef,
        titleRef,
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
        getStatusColor,
        getStatusBg,
        handleSend,
      }}
    >
      {children}
    </PfContext.Provider>
  )
}
