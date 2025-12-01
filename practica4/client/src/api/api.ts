import { type HttpRequestFormData } from '../types/htttpType'
import { type ApiResult } from '../types/apiType'
import { BASE_URL } from '../config/config'

export const onSubmit = async (
  data: HttpRequestFormData
): Promise<ApiResult | null> => {
  try {
    const raw = data.peticion.trim()
    if (!raw) {
      console.warn('Petición vacía')
      return null
    }

    const [rawMethod, rawPath] = raw.split(/\s+/, 2)
    const method = (rawMethod ?? '').toUpperCase()
    const path = rawPath ?? '/texto'

    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE']
    if (!allowedMethods.includes(method)) {
      console.warn('Método no soportado:', method)
      return null
    }

    const finalPath = path.startsWith('/') ? path : `/${path}`

    const response = await fetch(`${BASE_URL}${finalPath}`, {
      method,
      headers:
        method === 'GET'
          ? {}
          : {
              'Content-Type': 'text/plain; charset=utf-8',
            },
    })

    const contentType = response.headers.get('content-type') ?? ''
    let bodyText: string

    if (contentType.includes('application/json')) {
      const json = await response.json()
      bodyText = JSON.stringify(json, null, 2)
    } else {
      bodyText = await response.text()
    }

    return {
      status: response.status,
      contentType,
      body: bodyText,
    }
  } catch (error) {
    console.error('Error al enviar la peticion:', error)
    return null
  }
}
