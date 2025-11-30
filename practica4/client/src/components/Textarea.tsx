import { forwardRef } from 'react'
import { type TextareaProps } from '../types/inputsType'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ description, id, name, error, rows = 5, className, ...rest }, ref) => {
    const textareaId = id ?? name

    return (
      <div className="w-full mb-5 form-field">
        {description && (
          <label
            htmlFor={textareaId}
            className="block mb-1 text-sm text-gray-600"
          >
            {description}
          </label>
        )}

        <textarea
          id={textareaId}
          name={name}
          rows={rows}
          ref={ref}
          className={
            'block w-full text-sm text-gray-900 px-3 py-2 rounded-md border resize-y ' +
            'focus:outline-none focus:ring-2 ' +
            (error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
              : 'border-pixie-green-300 focus:border-pixie-green-600 focus:ring-pixie-green-200') +
            (className ? ` ${className}` : '')
          }
          {...rest}
        />

        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
