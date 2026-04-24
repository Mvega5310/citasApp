'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import {
  Store, Phone, MapPin, Mail, Instagram, Facebook,
  MessageCircle, Bell, Save, CheckCircle, Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';

type SalonSettings = {
  salonName: string;
  phone: string;
  address: string;
  city: string;
  contactEmail: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  notifyClient: boolean;
  notifyAdmin: boolean;
};

const DEFAULTS: SalonSettings = {
  salonName: 'BeautyTurno',
  phone: '+57 300 123 4567',
  address: 'Calle 123 #45-67',
  city: 'Bogotá',
  contactEmail: 'info@beautyturno.com',
  instagram: '',
  facebook: '',
  whatsapp: '',
  notifyClient: true,
  notifyAdmin: true,
};

function Field({
  label, icon: Icon, type = 'text', value, onChange, placeholder, hint,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Toggle({
  label, description, checked, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<SalonSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setSettings({ ...DEFAULTS, ...d }))
      .catch(() => toast.error('Error al cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof SalonSettings>(key: K, value: SalonSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        toast.success('Configuración guardada');
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        toast.error(d.error || 'Error al guardar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 pb-14 md:pb-0">
      <AdminSidebar />
      <AdminBottomNav />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — sticky para que no desaparezca al hacer scroll */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Configuración</h1>
            <p className="text-xs text-gray-400">Personaliza la información de tu salón</p>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0 max-w-2xl">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Información general */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary-500" />
                  Información del salón
                </h2>
                <div className="space-y-4">
                  <Field
                    label="Nombre del salón"
                    icon={Store}
                    value={settings.salonName}
                    onChange={(v) => set('salonName', v)}
                    placeholder="BeautyTurno"
                  />
                  <Field
                    label="Teléfono"
                    icon={Phone}
                    value={settings.phone}
                    onChange={(v) => set('phone', v)}
                    placeholder="+57 300 123 4567"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Dirección"
                      icon={MapPin}
                      value={settings.address}
                      onChange={(v) => set('address', v)}
                      placeholder="Calle 123 #45-67"
                    />
                    <Field
                      label="Ciudad"
                      icon={MapPin}
                      value={settings.city}
                      onChange={(v) => set('city', v)}
                      placeholder="Bogotá"
                    />
                  </div>
                  <Field
                    label="Email de contacto"
                    icon={Mail}
                    type="email"
                    value={settings.contactEmail}
                    onChange={(v) => set('contactEmail', v)}
                    placeholder="info@beautyturno.com"
                  />
                </div>
              </div>

              {/* Redes sociales */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary-500" />
                  Redes sociales
                </h2>
                <div className="space-y-4">
                  <Field
                    label="Instagram"
                    icon={Instagram}
                    value={settings.instagram}
                    onChange={(v) => set('instagram', v)}
                    placeholder="https://instagram.com/tu_salon"
                    hint="URL completa de tu perfil"
                  />
                  <Field
                    label="Facebook"
                    icon={Facebook}
                    value={settings.facebook}
                    onChange={(v) => set('facebook', v)}
                    placeholder="https://facebook.com/tu_salon"
                  />
                  <Field
                    label="WhatsApp"
                    icon={MessageCircle}
                    value={settings.whatsapp}
                    onChange={(v) => set('whatsapp', v)}
                    placeholder="+573024075828"
                    hint="Número con código de país, sin espacios"
                  />
                </div>
              </div>

              {/* Notificaciones */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary-500" />
                  Notificaciones por email
                </h2>
                <div className="space-y-5">
                  <Toggle
                    label="Confirmar al cliente"
                    description="Envía email de confirmación al cliente cuando hace una reserva"
                    checked={settings.notifyClient}
                    onChange={(v) => set('notifyClient', v)}
                  />
                  <div className="border-t border-gray-100" />
                  <Toggle
                    label="Notificar al administrador"
                    description="Envía email al admin con los detalles de cada nueva reserva"
                    checked={settings.notifyAdmin}
                    onChange={(v) => set('notifyAdmin', v)}
                  />
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {saved ? (
                    <><CheckCircle className="w-4 h-4" /> Guardado</>
                  ) : saving ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Guardando...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Guardar configuración</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
