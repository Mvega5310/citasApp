'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ChevronLeft, Loader2, Plus, X, Users, CalendarCheck } from 'lucide-react';
import Header from '@/components/cliente/Header';
import Calendar from '@/components/shared/Calendar';
import BottomNav from '@/components/cliente/BottomNav';
import { getAvailableHoursForDate, services } from '@/lib/shared/services';
import { normalizeBookingPayload, validateBookingPayload } from '@/lib/server/booking';
import { logger } from '@/lib/server/logger';
import { Service } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────
interface FormData {
  clientName: string;
  clientEmail: string;
  clientWhatsApp: string;
  notes?: string;
  acceptsDataPolicy: boolean;
  acceptsNotifications: boolean;
}

interface BookingResult {
  id: string;
  cancelUrl?: string;
  emailSent?: { sentToClient: boolean };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function btCode(id: string): string {
  return `BT-${id.slice(-4).toUpperCase()}`;
}

const STEP_LABELS = ['Servicio', 'Fecha', 'Hora', 'Datos'];

// ── Progress bar ───────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-center">
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const active = step === num;
          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                  style={{
                    background: done || active ? '#E84B85' : '#17231D',
                    border: `2px solid ${done || active ? '#E84B85' : '#2C3E36'}`,
                    color: done || active ? 'white' : '#5D7065',
                  }}
                >
                  {done ? '✓' : num}
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: active ? '#E84B85' : '#5D7065' }}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="w-10 h-0.5 mb-4 mx-1 transition-all duration-300"
                  style={{ background: step > num ? '#E84B85' : '#2C3E36' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tirilla de turno ───────────────────────────────────────────────────────
function Tirilla({
  result,
  service,
  date,
  time,
  email,
  onReset,
}: {
  result: BookingResult;
  service: Service;
  date: string;
  time: string;
  email: string;
  onReset: () => void;
}) {
  const code = btCode(result.id);
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const waText = encodeURIComponent(
    `¡Reservé mi turno en BeautyTurno!\n\nServicio: ${service.name}\nFecha: ${formatDateLabel(date)}\nHora: ${time}\nCódigo: ${code}${result.cancelUrl ? `\n\nCancelar: ${result.cancelUrl}` : ''}`
  );

  return (
    <div className="animate-bt-pop max-w-sm mx-auto">
      <div
        className="rounded-[22px] overflow-hidden"
        style={{ background: '#17231D', border: '1.5px solid #2C3E36' }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-5 text-center"
          style={{ background: 'linear-gradient(135deg, #E84B85 0%, #C93870 100%)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-3 font-bold text-white font-display text-sm">
            BT
          </div>
          <p className="text-white font-semibold text-lg font-display">BeautyTurno</p>
          <p className="text-white/80 text-sm mt-0.5">Turno Confirmado ✓</p>
        </div>

        {/* Perforated divider top */}
        <div className="relative flex items-center px-4">
          <div className="absolute -left-3 w-6 h-6 rounded-full" style={{ background: '#0A1210' }} />
          <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: '#2C3E36' }} />
          <div className="absolute -right-3 w-6 h-6 rounded-full" style={{ background: '#0A1210' }} />
        </div>

        {/* Details */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#5D7065' }}>
                Servicio
              </p>
              <p className="text-sm font-semibold" style={{ color: '#F1EDE3' }}>{service.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#5D7065' }}>
                Precio
              </p>
              <p className="text-sm font-bold" style={{ color: '#E84B85' }}>
                ${service.price.toLocaleString('es-CO')}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#5D7065' }}>
                Fecha
              </p>
              <p className="text-sm font-semibold capitalize" style={{ color: '#F1EDE3' }}>{dateLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#5D7065' }}>
                Hora
              </p>
              <p className="text-sm font-semibold" style={{ color: '#F1EDE3' }}>{time}</p>
            </div>
          </div>

          {/* Barcode */}
          <div
            className="w-full h-10 rounded-lg mb-2"
            style={{
              background:
                'repeating-linear-gradient(90deg, #2C3E36 0px, #2C3E36 2px, transparent 2px, transparent 6px)',
            }}
          />
          <p className="text-center font-mono font-bold text-base" style={{ color: '#F1EDE3' }}>
            {code}
          </p>
        </div>

        {/* Perforated divider bottom */}
        <div className="relative flex items-center px-4">
          <div className="absolute -left-3 w-6 h-6 rounded-full" style={{ background: '#0A1210' }} />
          <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: '#2C3E36' }} />
          <div className="absolute -right-3 w-6 h-6 rounded-full" style={{ background: '#0A1210' }} />
        </div>

        {/* Footer */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="w-4 h-4 shrink-0" style={{ color: '#1FA97C' }} />
            <p className="text-xs" style={{ color: '#9FB0A2' }}>
              Confirmación enviada a{' '}
              <span style={{ color: '#F1EDE3' }}>{email}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp w-full justify-center text-sm"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Compartir por WhatsApp
            </a>
            <button className="btn-outline w-full text-sm" onClick={() => {}}>
              + Agregar al calendario
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full mt-4 text-sm font-medium py-3 touch-manipulation"
        style={{ color: '#7C8F81' }}
      >
        Hacer otra reserva
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function BookingPage() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [additionalTimes, setAdditionalTimes] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
  } = useForm<FormData>();

  useEffect(() => {
    const serviceId = searchParams.get('service');
    if (!serviceId) return;
    const found = services.find((s) => s.id === serviceId);
    if (!found) return;
    setSelectedService(found);
    setSelectedDate('');
    setSelectedTime('');
    setStep(2);
  }, [searchParams]);

  const timeSlots =
    selectedService && selectedDate
      ? getAvailableHoursForDate(selectedDate, selectedService.duration)
      : [];

  const freeSlots = timeSlots.filter(
    (t) =>
      !bookedSlots.includes(t) &&
      t !== selectedTime &&
      !additionalTimes.includes(t)
  );

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedDate('');
    setSelectedTime('');
    setStep(2);
  };

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setBookedSlots([]);
    setStep(3);
    try {
      const res = await fetch(`/api/bookings/slots?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setBookedSlots(data.booked ?? []);
      }
    } catch {}
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(4);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as typeof step);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedTime('');
    setBookedSlots([]);
    setBookingResult(null);
    setConfirmedEmail('');
    setAdditionalTimes([]);
    resetForm();
  };

  const postSlot = async (data: FormData, slotTime: string): Promise<BookingResult> => {
    const payload = normalizeBookingPayload({
      ...data,
      serviceId: selectedService!.id,
      serviceName: selectedService!.name,
      date: selectedDate,
      time: slotTime,
      habeasDataAccepted: data.acceptsDataPolicy,
      notificationsAccepted: data.acceptsNotifications,
    });
    const validation = validateBookingPayload(payload);
    if (!validation.ok) throw new Error(validation.error);

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validation.data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Solicitud fallida');
    }
    return res.json();
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const allTimes = [selectedTime, ...additionalTimes];
      let firstResult: BookingResult | null = null;
      let successCount = 0;

      for (const t of allTimes) {
        try {
          const result = await postSlot(data, t);
          if (!firstResult) firstResult = result;
          successCount++;
        } catch (err) {
          logger.warn('booking_slot_failed', { time: t, error: String(err) });
        }
      }

      if (successCount === 0 || !firstResult) {
        throw new Error('No se pudo confirmar ninguna reserva. Por favor intenta de nuevo.');
      }

      logger.info('bookings_created', { count: successCount });
      setConfirmedEmail(data.clientEmail);
      setBookingResult(firstResult);
      setStep(5);
    } catch (err) {
      alert((err as Error).message || 'Error al crear la reserva. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ background: '#0A1210' }}>
      {step < 5 && <Header />}

      <div className="max-w-lg mx-auto px-5 py-6">
        {step >= 1 && step <= 4 && <ProgressBar step={step} />}

        {/* Step 1: Service selection */}
        {step === 1 && (
          <div className="animate-bt-up">
            <h1 className="text-2xl font-bold font-display mb-1" style={{ color: '#F1EDE3' }}>
              Elige tu servicio
            </h1>
            <p className="text-sm mb-6" style={{ color: '#7C8F81' }}>
              Selecciona el servicio que deseas reservar
            </p>
            <div className="flex flex-col gap-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="flex items-center gap-4 rounded-[18px] p-4 text-left transition-all duration-200 touch-manipulation active:scale-[0.98] w-full"
                  style={{ background: '#17231D', border: '1.5px solid #2C3E36' }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: '#22322A' }}
                  >
                    {service.icon}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-semibold text-sm mb-0.5" style={{ color: '#F1EDE3' }}>
                      {service.name}
                    </p>
                    <p className="text-xs" style={{ color: '#7C8F81' }}>
                      {service.duration} min
                    </p>
                  </div>
                  <p className="font-bold text-base shrink-0" style={{ color: '#E84B85' }}>
                    ${service.price.toLocaleString('es-CO')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Calendar */}
        {step === 2 && selectedService && (
          <div className="animate-bt-up">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleBack}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 touch-manipulation shrink-0"
                style={{ border: '1px solid #2C3E36', color: '#9FB0A2' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-xl font-bold font-display" style={{ color: '#F1EDE3' }}>
                  Selecciona una fecha
                </h1>
                <p className="text-xs" style={{ color: '#7C8F81' }}>
                  {selectedService.name} · ${selectedService.price.toLocaleString('es-CO')}
                </p>
              </div>
            </div>
            <div
              className="rounded-[22px] p-5"
              style={{ background: '#17231D', border: '1px solid #2C3E36' }}
            >
              <Calendar onDateSelect={handleDateSelect} selectedDate={selectedDate} />
            </div>
          </div>
        )}

        {/* Step 3: Time slots */}
        {step === 3 && selectedService && selectedDate && (
          <div className="animate-bt-up">
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={handleBack}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 touch-manipulation shrink-0"
                style={{ border: '1px solid #2C3E36', color: '#9FB0A2' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-xl font-bold font-display" style={{ color: '#F1EDE3' }}>
                  Selecciona un horario
                </h1>
                <p className="text-xs capitalize" style={{ color: '#7C8F81' }}>
                  {formatDateLabel(selectedDate)}
                </p>
              </div>
            </div>

            {timeSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {timeSlots.map((time) => {
                  const taken = bookedSlots.includes(time);
                  return (
                    <button
                      key={time}
                      onClick={() => !taken && handleTimeSelect(time)}
                      disabled={taken}
                      className={`time-slot ${taken ? 'booked' : ''}`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                className="rounded-[18px] p-6 text-center"
                style={{ background: '#17231D', border: '1px solid #2C3E36' }}
              >
                <p className="text-sm" style={{ color: '#9FB0A2' }}>
                  No hay horarios disponibles para este servicio en la fecha seleccionada.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Form */}
        {step === 4 && selectedService && selectedDate && selectedTime && (
          <div className="animate-bt-up">
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={handleBack}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 touch-manipulation shrink-0"
                style={{ border: '1px solid #2C3E36', color: '#9FB0A2' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-xl font-bold font-display" style={{ color: '#F1EDE3' }}>
                  Tus datos
                </h1>
                <p className="text-xs" style={{ color: '#7C8F81' }}>
                  {selectedService.name} · {formatDateLabel(selectedDate)} · {selectedTime}
                </p>
              </div>
            </div>

            {/* Summary chip */}
            <div
              className="rounded-[14px] p-4 mb-5 flex items-center gap-3"
              style={{ background: '#17231D', border: '1px solid #2C3E36' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: '#22322A' }}
              >
                {selectedService.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: '#F1EDE3' }}>
                  {selectedService.name}
                </p>
                <p className="text-xs capitalize" style={{ color: '#7C8F81' }}>
                  {formatDateLabel(selectedDate)} · {selectedTime}
                </p>
              </div>
              <p className="font-bold text-base shrink-0" style={{ color: '#E84B85' }}>
                ${selectedService.price.toLocaleString('es-CO')}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Name */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9FB0A2' }}>
                  Nombre completo *
                </label>
                <input
                  type="text"
                  placeholder="Tu nombre completo"
                  className="input-field"
                  {...register('clientName', {
                    required: 'El nombre es obligatorio',
                    minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                  })}
                />
                {errors.clientName && (
                  <p className="mt-1 text-xs" style={{ color: '#FF7A66' }}>{errors.clientName.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9FB0A2' }}>
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  className="input-field"
                  {...register('clientEmail', {
                    required: 'El correo electrónico es obligatorio',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Ingresa un correo electrónico válido',
                    },
                  })}
                />
                {errors.clientEmail && (
                  <p className="mt-1 text-xs" style={{ color: '#FF7A66' }}>{errors.clientEmail.message}</p>
                )}
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9FB0A2' }}>
                  Número de WhatsApp *
                </label>
                <input
                  type="tel"
                  placeholder="+57 300 123 4567"
                  className="input-field"
                  {...register('clientWhatsApp', {
                    required: 'El número de WhatsApp es obligatorio',
                    pattern: {
                      value: /^\+?[0-9\s()-]{7,20}$/,
                      message: 'Ingresa un número de teléfono válido',
                    },
                  })}
                />
                {errors.clientWhatsApp && (
                  <p className="mt-1 text-xs" style={{ color: '#FF7A66' }}>{errors.clientWhatsApp.message}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9FB0A2' }}>
                  Notas adicionales (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Alguna indicación especial para tu turno..."
                  className="input-field resize-none"
                  {...register('notes')}
                />
              </div>

              {/* Family booking */}
              {timeSlots.length > 1 && (
                <div
                  className="rounded-[14px] p-4"
                  style={{ border: '1px solid #2C3E36' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" style={{ color: '#9FB0A2' }} />
                    <p className="text-sm font-semibold" style={{ color: '#F1EDE3' }}>
                      ¿Reservar para familiares?
                    </p>
                  </div>
                  <p className="text-xs mb-3" style={{ color: '#5D7065' }}>
                    Agrega hasta 2 horarios adicionales (mismo día y servicio).
                  </p>

                  {additionalTimes.map((t, index) => {
                    const options = timeSlots.filter(
                      (s) =>
                        !bookedSlots.includes(s) &&
                        s !== selectedTime &&
                        (s === t || !additionalTimes.includes(s))
                    );
                    return (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <span className="text-xs shrink-0" style={{ color: '#7C8F81', minWidth: '72px' }}>
                          Familiar {index + 2}:
                        </span>
                        <select
                          value={t}
                          onChange={(e) =>
                            setAdditionalTimes((prev) =>
                              prev.map((x, i) => (i === index ? e.target.value : x))
                            )
                          }
                          className="input-field py-2 text-sm flex-1"
                        >
                          {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setAdditionalTimes((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="p-1 touch-manipulation"
                          style={{ color: '#5D7065' }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {additionalTimes.length < 2 && freeSlots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAdditionalTimes((prev) => [...prev, freeSlots[0]])}
                      className="flex items-center gap-1 text-sm font-medium transition-colors touch-manipulation mt-1"
                      style={{ color: '#E84B85' }}
                    >
                      <Plus className="w-4 h-4" />
                      Agregar horario para familiar
                    </button>
                  )}
                </div>
              )}

              {/* Habeas data */}
              <div className="space-y-3 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#5D7065' }}>
                  Autorización de datos personales
                </p>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptsDataPolicy"
                    {...register('acceptsDataPolicy', {
                      required: 'Debes aceptar el tratamiento de tus datos personales.',
                    })}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded"
                    style={{ accentColor: '#E84B85' }}
                  />
                  <label
                    htmlFor="acceptsDataPolicy"
                    className="text-xs leading-relaxed cursor-pointer"
                    style={{ color: '#7C8F81' }}
                  >
                    <span style={{ color: '#FF7A66' }}>*</span>{' '}
                    Autorizo el tratamiento de mis datos personales (nombre, correo y WhatsApp) con el fin exclusivo de gestionar mi cita, de conformidad con la{' '}
                    <strong style={{ color: '#9FB0A2' }}>Ley 1581 de 2012</strong>.
                  </label>
                </div>
                {errors.acceptsDataPolicy && (
                  <p className="text-xs ml-7" style={{ color: '#FF7A66' }}>{errors.acceptsDataPolicy.message}</p>
                )}

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptsNotifications"
                    {...register('acceptsNotifications', {
                      required: 'Debes autorizar el envío de notificaciones.',
                    })}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded"
                    style={{ accentColor: '#E84B85' }}
                  />
                  <label
                    htmlFor="acceptsNotifications"
                    className="text-xs leading-relaxed cursor-pointer"
                    style={{ color: '#7C8F81' }}
                  >
                    <span style={{ color: '#FF7A66' }}>*</span>{' '}
                    Autorizo el envío de notificaciones y recordatorios por correo y WhatsApp.
                  </label>
                </div>
                {errors.acceptsNotifications && (
                  <p className="text-xs ml-7" style={{ color: '#FF7A66' }}>{errors.acceptsNotifications.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirmando reserva...
                  </>
                ) : additionalTimes.length > 0 ? (
                  `Confirmar ${1 + additionalTimes.length} citas`
                ) : (
                  'Confirmar Reserva'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 5: Tirilla */}
        {step === 5 && bookingResult && selectedService && (
          <Tirilla
            result={bookingResult}
            service={selectedService}
            date={selectedDate}
            time={selectedTime}
            email={confirmedEmail}
            onReset={handleReset}
          />
        )}
      </div>

      {step < 5 && <BottomNav />}
    </div>
  );
}
