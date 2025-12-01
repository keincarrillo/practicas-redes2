// types/contextType.ts
import type {
  ReactNode,
  Dispatch,
  SetStateAction,
  MutableRefObject,
} from 'react'
import type { HttpMethod } from './htttpType'
import type { ApiResult } from './apiType'

export interface PfProviderProps {
  children: ReactNode
}

export interface PfContextValue {
  containerRef: MutableRefObject<HTMLDivElement | null>
  titleRef: MutableRefObject<HTMLHeadingElement | null>

  method: HttpMethod
  setMethod: Dispatch<SetStateAction<HttpMethod>>
  endpoint: string
  setEndpoint: Dispatch<SetStateAction<string>>
  isLoading: boolean
  setIsLoading: Dispatch<SetStateAction<boolean>>
  response: ApiResult | null
  setResponse: Dispatch<SetStateAction<ApiResult | null>>
  error: string
  setError: Dispatch<SetStateAction<string>>

  getStatusColor: (status: number) => string
  getStatusBg: (status: number) => string
  handleSend: () => Promise<void>
}
