import { type HttpRequestFormData } from '../types/htttpType'

export const onSubmit = async (data: HttpRequestFormData) => {
  try {
    console.log('Datos del formulario:', data)
  } catch (error) {
    console.error('Error al enviar:', error)
  }
}
