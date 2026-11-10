'use client';

import { Suspense, useState } from 'react';
import { useCatalog } from '@/lib/shared/useCatalog';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, CheckCircle2, Eye, EyeOff, Lock, X } from 'lucide-react';

// El nombre sale del catálogo: es por barbería, no de la variable global.
const NOMBRE_GENERICO = 'Barbería';

const inputCls =
  'w-full bg-cafe-soft border border-cafe-border rounded-lg pl-10 pr-12 py-3 text-cafe-text placeholder-cafe-subtle focus:outline-none focus:ring-2 focus:ring-cafe-gold/50 focus:border-transparent transition';

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-300' : 'text-cafe-subtle'}`}>
      {ok ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <X className="w-3.5 h-3.5" aria-hidden="true" />}
      {children}
    </li>
  );
}

function PasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const rules = {
    length: password.length >= 8,
    mix: /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password),
    match: password.length > 0 && password === confirm,
  };
  const valid = rules.length && rules.mix && rules.match;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDone(true);
      else setError(data.error || 'No se pudo guardar la contraseña');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <p className="text-sm text-cafe-muted">
        Este enlace no es válido. Pide uno nuevo desde{' '}
        <Link href="/admin/login" className="text-cafe-goldlight underline underline-offset-2">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto" aria-hidden="true" />
        <p className="text-cafe-text font-semibold">¡Contraseña guardada!</p>
        <p className="text-sm text-cafe-muted">Ya puedes entrar al panel con tu correo y tu nueva contraseña.</p>
        <Link
          href="/admin/login"
          className="inline-flex w-full items-center justify-center gap-2 bg-cafe-gold text-cafe-bg font-semibold py-3 rounded-lg hover:bg-cafe-goldlight transition"
        >
          <Lock className="w-4 h-4" aria-hidden="true" />
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-cafe-text mb-1.5">
          Nueva contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cafe-subtle" aria-hidden="true" />
          <input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            maxLength={128}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cafe-subtle hover:text-cafe-text"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-cafe-text mb-1.5">
          Repite la contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cafe-subtle" aria-hidden="true" />
          <input
            id="confirm"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
            maxLength={128}
          />
        </div>
      </div>

      <ul className="space-y-1" aria-label="Requisitos de la contraseña">
        <Rule ok={rules.length}>Al menos 8 caracteres</Rule>
        <Rule ok={rules.mix}>Letras y números</Rule>
        <Rule ok={rules.match}>Ambas contraseñas coinciden</Rule>
      </ul>

      {error && (
        <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || saving}
        className="w-full bg-cafe-gold text-cafe-bg font-semibold py-3 rounded-lg hover:bg-cafe-goldlight disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-cafe-bg/30 border-t-cafe-bg rounded-full animate-spin" />
        ) : (
          <Lock className="w-4 h-4" aria-hidden="true" />
        )}
        {saving ? 'Guardando...' : 'Guardar contraseña'}
      </button>
    </form>
  );
}

export default function PasswordPage() {
  const { catalog } = useCatalog();
  const nombre = catalog?.salonName ?? '';
  return (
    <div className="min-h-screen bg-cafe-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/logo?size=128" alt={nombre || NOMBRE_GENERICO} className="inline-flex w-16 h-16 rounded-2xl shadow-lg mb-4 object-cover" />
          <h1 className="text-2xl font-display font-medium text-cafe-text">{nombre}</h1>
          <p className="text-cafe-muted text-sm mt-1">Panel de Administración</p>
        </div>
        <div className="bg-cafe-card rounded-2xl shadow-lg border border-cafe-border p-8">
          <h2 className="text-lg font-semibold text-cafe-text mb-5">Crea tu contraseña</h2>
          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-cafe-border border-t-cafe-gold rounded-full animate-spin" />
              </div>
            }
          >
            <PasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
