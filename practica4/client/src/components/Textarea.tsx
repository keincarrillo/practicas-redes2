import { forwardRef } from 'react'
import { type TextareaProps } from '../types/inputsType'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ description, id, name, error, ...rest }, ref) => {
    const textareaId = id ?? name

    return (
      <div className="relative z-0 w-full mb-5 group form-field">
        <textarea
          id={textareaId}
          name={name}
          rows={5}
          ref={ref}
          className={
            'block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ' +
            'appearance-none focus:outline-none focus:ring-0 peer resize-none ' +
            (error
              ? 'border-red-500 focus:border-red-500'
              : 'border-pixie-green-300 focus:border-pixie-green-600')
          }
          placeholder=" "
          {...rest}
        />

        <label
          htmlFor={textareaId}
          className="absolute text-sm text-gray-600 duration-300 transform -translate-y-6 scale-75 
                    top-3 -z-10 origin-[0] peer-focus:start-0 peer-focus:text-pixie-green-600 
                    peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 
                    peer-focus:scale-75 peer-focus:-translate-y-6 
                    rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto"
        >
          {description}
        </label>

        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
