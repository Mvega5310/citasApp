'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Appointment } from '@/types';
import { Calendar, Clock, User, Mail, Phone, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockAppointments: Appointment[] = [
      {
        id: '1',
        serviceId: 'manicure',
        serviceName: 'Manicure',
        clientName: 'María González',
        clientEmail: 'maria@email.com',
        clientWhatsApp: '+57 300 123 4567',
        date: '2024-01-15',
        time: '10:00',
        status: 'confirmed',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10')
      },
      {
        id: '2',
        serviceId: 'pedicure',
        serviceName: 'Pedicure',
        clientName: 'Ana Rodríguez',
        clientEmail: 'ana@email.com',
        clientWhatsApp: '+57 300 987 6543',
        date: '2024-01-15',
        time: '14:30',
        status: 'pending',
        createdAt: new Date('2024-01-11'),
        updatedAt: new Date('2024-01-11')
      },
      {
        id: '3',
        serviceId: 'blower',
        serviceName: 'Blower',
        clientName: 'Laura Martínez',
        clientEmail: 'laura@email.com',
        clientWhatsApp: '+57 300 555 1234',
        date: '2024-01-16',
        time: '16:00',
        status: 'completed',
        createdAt: new Date('2024-01-12'),
        updatedAt: new Date('2024-01-12')
      }
    ];

    setTimeout(() => {
      setAppointments(mockAppointments);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelada';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };

  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    setAppointments(prev => 
      prev.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: newStatus as any, updatedAt: new Date() }
          : apt
      )
    );
    toast.success('Estado actualizado correctamente');
  };

  const handleDelete = (appointmentId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      toast.success('Cita eliminada correctamente');
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando citas...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-serif">
            Panel de Administración
          </h1>
          <p className="text-gray-600">
            Gestiona todas las citas y reservas de BeautyTurno
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Citas</p>
                <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {appointments.filter(apt => apt.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {appointments.filter(apt => apt.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completadas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {appointments.filter(apt => apt.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Citas Recientes</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Servicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.clientName}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {appointment.clientEmail}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {appointment.clientWhatsApp}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.serviceName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(appointment.date).toLocaleDateString('es-ES')}
                      </div>
                      <div className="text-sm text-gray-500">{appointment.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={appointment.status}
                        onChange={(e) => handleStatusChange(appointment.id, e.target.value)}
                        className={`text-sm px-2 py-1 rounded-full font-medium ${getStatusColor(appointment.status)}`}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="completed">Completada</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(appointment)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(appointment.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
} 