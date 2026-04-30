'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { CheckCircle, Loader2, Plus, X, Users } from 'lucide-react';
import { normalizeBookingPayload, validateBookingPayload } from '@/lib/server/booking';
import { logger } from '@/lib/server/logger';
import { BookingFormData, Service } from '@/types';

interface BookingFormProps {
  service: Service;
  date: string;
  time: string;
  availableSlots?: string[];
  bookedSlots?: string[];
  apiBase?: string;
}

export default function BookingForm({
  service,
  date,
  time,
  availableSlots = [],
  bookedSlots = [],
  apiBase = '/api/bookings',
}: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmedSlots, setConfirmedSlots] = useState<string[]>([]);
  const [additionalTimes, setAdditionalTimes] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BookingFormData>();

  const freeSlots = availableSlots.filter(
    (t) => !bookedSlots.includes(t) && t !== time && !additionalTimes.includes(t)
  );

  const addFamilySlot = () => {
    if (additionalTimes.length >= 2 || freeSlots.length === 0) return;
    setAdditionalTimes((prev) => [...prev, freeSlots[0]]);
  };

  const updateFamilySlot = (index: number, value: string) => {
    setAdditionalTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
  };

  const removeFamilySlot = (index: number) => {
    setAdditionalTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const postBooking = async (
    data: BookingFormData,
    slotTime: string
  ): Promise<{ ok: boolean; time: string }> => {
    const bookingPayload = normalizeBookingPayload({
      ...data,
      serviceId: service.id,
      serviceName: service.name,
      date,
      time: slotTime,
      habeasDataAccepted: data.acceptsDataPolicy,
      notificationsAccepted: data.acceptsNotifications,
    });
    const validation = validateBookingPayload(bookingPayload);
    if (!validation.ok) {
      toast.error(`${slotTime}: ${validation.error}`);
      return { ok: false, time: slotTime };
    }
    const res = await fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validation.data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(`${slotTime}: ${err?.error || 'Solicitud fallida'}`);
      return { ok: false, time: slotTime };
    }
    return { ok: true, time: slotTime };
  };

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    try {
      const allTimes = [time, ...additionalTimes];
      const results = await Promise.all(allTimes.map((t) => postBooking(data, t)));
      const successful = results.filter((r) => r.ok).map((r) => r.time);

      if (successful.length === 0) return;

      logger.info('bookings_created', { count: successful.length });

      if (successful.length === allTimes.length) {
        toast.success(
          allTimes.length > 1
            ? `${successful.length} citas confirmadas. Recibirás confirmación por correo.`
            : 'Reserva confirmada. Te enviamos un correo de confirmación.'
        );
      } else {
        toast.success(`${successful.length} de ${allTimes.length} citas confirmadas.`);
      }

      setConfirmedSlots(successful);
      setIsSuccess(true);
      reset();
    } catch (error) {
      logger.error('booking_error', { error: String(error) });
      toast.error('Error al crear la reserva. Por favor, intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Reserva{confirmedSlots.length > 1 ? 's' : ''} confirmada{confirmedSlots.length > 1 ? 's' : ''}!</h2>
        <p className="text-gray-600 mb-6">
          {confirmedSlots.length > 1
            ? 'Las citas fueron registradas exitosamente.'
            : 'Tu cita fue registrada exitosamente.'}{' '}
          Recibirás una confirmación por correo con los detalles.
        </p>
        <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="font-semibold text-gray-900 mb-3">
            {confirmedSlots.length > 1 ? 'Detalles de tus citas:' : 'Detalles de tu cita:'}
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p><strong>Servicio:</strong> {service.name}</p>
            <p>
              <strong>Fecha:</strong>{' '}
              {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            {confirmedSlots.map((t) => (
              <p key={t}><strong>Hora:</strong> {t}</p>
            ))}
            <p><strong>Precio por cita:</strong> ${service.price.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto">
      <div className="space-y-6">
        {/* Resumen */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Resumen de tu reserva:</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Servicio:</strong> {service.name}</p>
            <p>
              <strong>Fecha:</strong>{' '}
              {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p><strong>Hora:</strong> {time}</p>
            <p><strong>Precio:</strong> ${service.price.toLocaleString()}</p>
          </div>
        </div>

        {/* Datos personales */}
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre completo *
          </label>
          <input
            type="text"
            id="clientName"
            {...register('clientName', {
              required: 'El nombre es obligatorio',
              minLength: { value: 2, message: 'El nombre debe tener al menos 2 caracteres' },
            })}
            className={`input-field ${errors.clientName ? 'border-red-500' : ''}`}
            placeholder="Ingresa tu nombre completo"
          />
          {errors.clientName && (
            <p className="mt-1 text-sm text-red-600">{errors.clientName.message}</p>
          )}
        </div>

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
                message: 'Ingresa un correo electrónico válido',
              },
            })}
            className={`input-field ${errors.clientEmail ? 'border-red-500' : ''}`}
            placeholder="tu@email.com"
          />
          {errors.clientEmail && (
            <p className="mt-1 text-sm text-red-600">{errors.clientEmail.message}</p>
          )}
        </div>

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
                value: /^\+?[0-9\s()-]{7,20}$/,
                message: 'Ingresa un número de teléfono válido',
              },
            })}
            className={`input-field ${errors.clientWhatsApp ? 'border-red-500' : ''}`}
            placeholder="+57 300 123 4567"
          />
          {errors.clientWhatsApp && (
            <p className="mt-1 text-sm text-red-600">{errors.clientWhatsApp.message}</p>
          )}
        </div>

        {/* Reserva familiar */}
        {availableSlots.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary-600" />
              <h4 className="text-sm font-semibold text-gray-800">¿Reservar para más familiares?</h4>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Puedes agregar hasta 2 horarios adicionales para tu núcleo familiar (mismo día y servicio).
            </p>

            {additionalTimes.map((t, index) => {
              const options = availableSlots.filter(
                (s) =>
                  !bookedSlots.includes(s) &&
                  s !== time &&
                  (s === t || !additionalTimes.includes(s))
              );
              return (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 w-20 shrink-0">Familiar {index + 2}:</span>
                  <select
                    value={t}
                    onChange={(e) => updateFamilySlot(index, e.target.value)}
                    className="input-field py-2 text-sm flex-1"
                  >
                    {options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeFamilySlot(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Eliminar horario"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {additionalTimes.length < 2 && freeSlots.length > 0 && (
              <button
                type="button"
                onClick={addFamilySlot}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium mt-1"
              >
                <Plus className="w-4 h-4" />
                Agregar horario para familiar
              </button>
            )}

            {freeSlots.length === 0 && additionalTimes.length === 0 && (
              <p className="text-xs text-gray-400">No hay más horarios disponibles para este día.</p>
            )}
          </div>
        )}

        {/* Habeas Data */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Autorización de datos personales
          </p>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="acceptsDataPolicy"
              {...register('acceptsDataPolicy', {
                required: 'Debes aceptar el tratamiento de tus datos personales para continuar.',
              })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0"
            />
            <label htmlFor="acceptsDataPolicy" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
              <span className="text-red-500">*</span> Autorizo el tratamiento de mis datos personales
              (nombre, correo y WhatsApp) con el fin exclusivo de gestionar mi cita, de conformidad
              con la{' '}
              <strong>Ley 1581 de 2012</strong> de protección de datos personales (Habeas Data).
            </label>
          </div>
          {errors.acceptsDataPolicy && (
            <p className="text-sm text-red-600 ml-7">{errors.acceptsDataPolicy.message}</p>
          )}

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="acceptsNotifications"
              {...register('acceptsNotifications', {
                required: 'Debes autorizar el envío de notificaciones para recibir la confirmación de tu cita.',
              })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0"
            />
            <label htmlFor="acceptsNotifications" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
              <span className="text-red-500">*</span> Autorizo el envío de notificaciones y
              recordatorios de mi cita por correo electrónico y WhatsApp al número y correo
              registrados.
            </label>
          </div>
          {errors.acceptsNotifications && (
            <p className="text-sm text-red-600 ml-7">{errors.acceptsNotifications.message}</p>
          )}
        </div>

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
          ) : additionalTimes.length > 0 ? (
            `Confirmar ${1 + additionalTimes.length} citas`
          ) : (
            'Confirmar Reserva'
          )}
        </button>
      </div>
    </form>
  );
}
