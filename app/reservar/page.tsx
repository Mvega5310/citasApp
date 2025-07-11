'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookingForm from '@/components/BookingForm';
import ServiceSelector from '@/components/ServiceSelector';
import Calendar from '@/components/Calendar';
import { services } from '@/lib/services';
import { Service } from '@/types';

export default function BookingPage() {
  const searchParams = useSearchParams();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [step, setStep] = useState<number>(1);

  // Initialize with service from URL params
  useEffect(() => {
    const serviceId = searchParams.get('service');
    if (serviceId) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        setSelectedService(service);
        setStep(2);
      }
    }
  }, [searchParams]);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setStep(3);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(4);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= stepNumber 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div className={`
                    w-16 h-1 mx-2
                    ${step > stepNumber ? 'bg-primary-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4 space-x-8 text-sm">
            <span className={step >= 1 ? 'text-primary-600 font-medium' : 'text-gray-500'}>
              Servicio
            </span>
            <span className={step >= 2 ? 'text-primary-600 font-medium' : 'text-gray-500'}>
              Fecha
            </span>
            <span className={step >= 3 ? 'text-primary-600 font-medium' : 'text-gray-500'}>
              Hora
            </span>
            <span className={step >= 4 ? 'text-primary-600 font-medium' : 'text-gray-500'}>
              Datos
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {step === 1 && (
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4 font-serif">
                Selecciona tu servicio
              </h1>
              <p className="text-gray-600 mb-8">
                Elige el servicio que deseas reservar
              </p>
              <ServiceSelector 
                services={services}
                onSelect={handleServiceSelect}
              />
            </div>
          )}

          {step === 2 && selectedService && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handleBack}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  ← Volver
                </button>
                <div className="text-right">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedService.name}
                  </h2>
                  <p className="text-gray-600">
                    ${selectedService.price.toLocaleString()} • {selectedService.duration} min
                  </p>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4 font-serif text-center">
                Selecciona una fecha
              </h1>
              <Calendar 
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate}
              />
            </div>
          )}

          {step === 3 && selectedService && selectedDate && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handleBack}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  ← Volver
                </button>
                <div className="text-right">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedService.name}
                  </h2>
                  <p className="text-gray-600">
                    {new Date(selectedDate).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4 font-serif text-center">
                Selecciona una hora
              </h1>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
                  '18:00', '18:30', '19:00', '19:30'].map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={`
                      time-slot text-center py-3
                      ${selectedTime === time ? 'selected' : ''}
                    `}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && selectedService && selectedDate && selectedTime && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handleBack}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  ← Volver
                </button>
                <div className="text-right">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedService.name}
                  </h2>
                  <p className="text-gray-600">
                    {new Date(selectedDate).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} a las {selectedTime}
                  </p>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4 font-serif text-center">
                Completa tus datos
              </h1>
              <BookingForm 
                service={selectedService}
                date={selectedDate}
                time={selectedTime}
              />
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
} 