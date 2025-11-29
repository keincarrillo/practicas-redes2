import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

import { Input } from './components/Input'
import { Textarea } from './components/Textarea'

function App() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const subtitleRef = useRef<HTMLParagraphElement | null>(null)
  const formRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(containerRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 0.6,
        ease: 'back.out(1.7)'
      })

      gsap.from(titleRef.current, {
        y: -50,
        opacity: 0,
        duration: 0.8,
        delay: 0.3,
        ease: 'power3.out'
      })

      gsap.from(subtitleRef.current, {
        y: -30,
        opacity: 0,
        duration: 0.8,
        delay: 0.5,
        ease: 'power3.out'
      })

      gsap.from('.form-field', {
        x: -50,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        delay: 0.7,
        ease: 'power2.out'
      })

      gsap.from(buttonRef.current, {
        scale: 0,
        opacity: 0,
        duration: 0.5,
        delay: 1.5,
        ease: 'back.out(1.7)'
      })
    })

    const button = buttonRef.current
    if (!button) {
      return () => ctx.revert()
    }

    const handleMouseEnter = () => {
      gsap.to(button, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out'
      })
    }

    const handleMouseLeave = () => {
      gsap.to(button, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      })
    }

    button.addEventListener('mouseenter', handleMouseEnter)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter)
      button.removeEventListener('mouseleave', handleMouseLeave)
      ctx.revert()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pixie-green-50 via-pixie-green-100 to-pixie-green-200 flex items-center justify-center p-6">
      <div
        ref={containerRef}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 md:p-12 border-t-4 border-pixie-green-500"
      >
        <div className="text-center mb-10">
          <h2
            ref={titleRef}
            className="text-3xl font-bold bg-gradient-to-r from-pixie-green-600 to-pixie-green-500 bg-clip-text text-transparent mb-2"
          >
            Petición HTTP
          </h2>
          <p ref={subtitleRef} className="text-gray-600">
            Escribe aquí el cuerpo de tu petición HTTP
          </p>
        </div>

        <div ref={formRef} className="max-w-md mx-auto">
          <Input
            description="Tipo de peticion"
            id="peticion"
            name="peticion"
            type="text"
          />

          <Textarea
            description="Cuerpo de la petición"
            id="descripcion"
            name="descripcion"
          />

          <button
            ref={buttonRef}
            type="submit"
            className="text-white bg-pixie-green-600 box-border border border-transparent hover:bg-pixie-green-700 focus:ring-4 focus:ring-pixie-green-300 shadow-xs font-medium leading-5 rounded-lg text-sm px-4 py-2.5 focus:outline-none w-full uppercase"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
