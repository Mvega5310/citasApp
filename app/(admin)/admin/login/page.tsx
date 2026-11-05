'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Marcos BarberShop';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // "¿Olvidaste tu contraseña?": pide el correo y envía un enlace
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [forgotSent, setForgotSent] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) setForgotSent(true);
      else toast.error((await res.json().catch(() => ({}))).error || 'No se pudo enviar el enlace');
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        toast.success('Bienvenido al panel');
        router.push(redirect);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Correo o contraseña incorrectos');
        setPassword('');
      }
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot') {
    return forgotSent ? (
      <div className="space-y-4 text-center">
        <p className="text-sm text-cafe-muted leading-relaxed">
          Si <strong className="text-cafe-text">{email.trim()}</strong> pertenece a un administrador, en unos minutos
          recibirás un enlace para crear tu contraseña. Revisa también la carpeta de spam.
        </p>
        <button
          type="button"
          onClick={() => { setMode('login'); setForgotSent(false); }}
          className="text-sm font-semibold text-cafe-goldlight hover:underline"
        >
          Volver a iniciar sesión
        </button>
      </div>
    ) : (
      <form onSubmit={handleForgot} className="space-y-4" noValidate>
        <p className="text-sm text-cafe-muted leading-relaxed">
          Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.
        </p>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cafe-subtle" aria-hidden="true" />
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@ejemplo.com"
            aria-label="Correo electrónico"
            autoFocus
            className="w-full bg-cafe-soft border border-cafe-border rounded-lg pl-10 pr-4 py-3 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 focus:border-transparent transition"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full bg-cafe-gold text-cafe-bg font-semibold py-3 rounded-lg hover:bg-cafe-goldlight disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
        <button
          type="button"
          onClick={() => setMode('login')}
          className="w-full text-sm text-cafe-muted hover:text-cafe-text"
        >
          Volver
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-cafe-text mb-1.5">
          Correo electrónico
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cafe-subtle" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@ejemplo.com"
            required
            autoFocus
            className="w-full bg-cafe-soft border border-cafe-border rounded-lg pl-10 pr-4 py-3 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 focus:border-transparent transition"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-cafe-text mb-1.5">
          Contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cafe-subtle" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full bg-cafe-soft border border-cafe-border rounded-lg pl-10 pr-12 py-3 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 focus:border-transparent transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cafe-subtle hover:text-cafe-muted"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !email.trim() || !password.trim()}
        className="w-full bg-cafe-gold text-cafe-bg font-semibold py-3 rounded-lg hover:bg-cafe-goldlight disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 mt-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-cafe-bg/30 border-t-cafe-bg rounded-full animate-spin" />
            Verificando...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Ingresar
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => setMode('forgot')}
        className="w-full text-sm text-cafe-goldlight hover:underline"
      >
        ¿Primera vez o no recuerdas tu contraseña?
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-cafe-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/logo?size=128"
            alt={APP_NAME}
            className="inline-flex w-16 h-16 rounded-2xl shadow-lg mb-4 object-cover"
          />
          <h1 className="text-2xl font-bold text-cafe-text font-serif">{APP_NAME}</h1>
          <p className="text-cafe-muted text-sm mt-1">Panel de Administración</p>
        </div>

        <div className="bg-cafe-card rounded-2xl shadow-lg border border-cafe-border p-8">
          <h2 className="text-lg font-semibold text-cafe-text mb-5">Acceso seguro</h2>

          <Suspense fallback={
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-cafe-border border-t-cafe-gold rounded-full animate-spin" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-cafe-subtle mt-6">
          Solo personal autorizado · {APP_NAME} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
