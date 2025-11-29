import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

export type InputsProps = {
  description: string
  error?: string
  containerClassName?: string
} & InputHTMLAttributes<HTMLInputElement>

export type TextareaProps = {
  description: string
  error?: string
  containerClassName?: string
} & TextareaHTMLAttributes<HTMLTextAreaElement>
