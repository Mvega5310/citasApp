'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Service, BookingFormData } from '@/types';
import toast from 'react-hot-toast';
import { CheckCircle, Loader2 } from 'lucide-react';

interface BookingFormProps {
  service: Service;
  date: string;
  time: string;
}

export default function BookingForm({ service, date, time }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<BookingFormData>();

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would typically send the data to your backend
      const bookingData = {
        ...data,
        serviceId: service.id,
        serviceName: service.name,
        date,
        time,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Booking data:', bookingData);
      
      // Show success message
      toast.success('¡Reserva confirmada! Te hemos enviado un correo de confirmación.');
      setIsSuccess(true);
      reset();
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Error al crear la reserva. Por favor, intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Reserva Confirmada!
        </h2>
        <p className="text-gray-600 mb-6">
          Tu cita ha sido reservada exitosamente. Te hemos enviado un correo de confirmación 
          con todos los detalles.
        </p>
        <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="font-semibold text-gray-900 mb-3">Detalles de tu cita:</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Servicio:</strong> {service.name}</p>
            <p><strong>Fecha:</strong> {new Date(date).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>Hora:</strong> {time}</p>
            <p><strong>Precio:</strong> ${service.price.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto">
      <div className="space-y-6">
        {/* Service Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Resumen de tu reserva:</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Servicio:</strong> {service.name}</p>
            <p><strong>Fecha:</strong> {new Date(date).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>Hora:</strong> {time}</p>
            <p><strong>Precio:</strong> ${service.price.toLocaleString()}</p>
          </div>
        </div>

        {/* Name Field */}
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre completo *
          </label>
          <input
            type="text"
            id="clientName"
            {...register('clientName', { 
              required: 'El nombre es obligatorio',
              minLength: { value: 2, message: 'El nombre debe tener al menos 2 caracteres' }
            })}
            className={`input-field ${errors.clientName ? 'border-red-500' : ''}`}
            placeholder="Ingresa tu nombre completo"
          />
          {errors.clientName && (
            <p className="mt-1 text-sm text-red-600">{errors.clientName.message}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Correo electrónico *
          </label>
          <input
            type="email"
            id="clientEmail"
            {...register('clientEmail', { 
              required: 'El correo electrónico es obligatorio',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Ingresa un correo electrónico válido'
              }
            })}
            className={`input-field ${errors.clientEmail ? 'border-red-500' : ''}`}
            placeholder="tu@email.com"
          />
          {errors.clientEmail && (
            <p className="mt-1 text-sm text-red-600">{errors.clientEmail.message}</p>
          )}
        </div>

        {/* WhatsApp Field */}
        <div>
          <label htmlFor="clientWhatsApp" className="block text-sm font-medium text-gray-700 mb-2">
            Número de WhatsApp *
          </label>
          <input
            type="tel"
            id="clientWhatsApp"
            {...register('clientWhatsApp', { 
              required: 'El número de WhatsApp es obligatorio',
              pattern: {
                value: /^\+?[1-9]\d{1,14}$/,
                message: 'Ingresa un número de teléfono válido'
              }
            })}
            className={`input-field ${errors.clientWhatsApp ? 'border-red-500' : ''}`}
            placeholder="+57 300 123 4567"
          />
          {errors.clientWhatsApp && (
            <p className="mt-1 text-sm text-red-600">{errors.clientWhatsApp.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Confirmando reserva...
            </>
          ) : (
            'Confirmar Reserva'
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Al confirmar tu reserva, aceptas nuestros términos y condiciones. 
          Recibirás un correo de confirmación con los detalles de tu cita.
        </p>
      </div>
    </form>
  );
} 