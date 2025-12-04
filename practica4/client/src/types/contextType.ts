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

export type ViewMode = 'raw' | 'rendered'

export interface PfContextValue {
  containerRef: MutableRefObject<HTMLDivElement | null>
  titleRef: MutableRefObject<HTMLHeadingElement | null>
  iframeRef: MutableRefObject<HTMLIFrameElement | null>

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
  viewMode: ViewMode
  setViewMode: Dispatch<SetStateAction<ViewMode>>

  getStatusColor: (status: number) => string
  getStatusBg: (status: number) => string
  shouldRenderContent: (contentType: string) => boolean
  handleSend: () => Promise<void>
}
