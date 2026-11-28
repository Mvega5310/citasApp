'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Cuelga un diálogo de <body>, fuera de donde esté el botón que lo abrió.
 *
 * No es un adorno, arregla un bug concreto: el encabezado del cliente y la
 * barra superior del panel llevan `backdrop-blur`, y un elemento con
 * `backdrop-filter` se vuelve el **bloque contenedor** de sus descendientes
 * `position: fixed`. O sea que `fixed inset-0` dentro del encabezado no medía
 * la pantalla sino la franja del propio encabezado: el diálogo quedaba
 * centrado en esos 64 px y la mitad de arriba se salía de la pantalla, sin
 * forma de alcanzarla ni de leer el título. Medido en el navegador: 375x64
 * dentro del encabezado contra 375x812 colgado de <body>.
 *
 * De paso, mientras está abierto bloquea el scroll del fondo y cierra con Esc.
 */
export default function ModalPortal({
  onCerrar,
  children,
}: {
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  const [montado, setMontado] = useState(false);

  // Por referencia: quien usa esto suele pasar una función nueva en cada
  // render, y con ella en las dependencias el efecto se repetiría y acabaría
  // "restaurando" el scroll al valor bloqueado, dejando la página trabada.
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarRef.current();
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener('keydown', alTeclear);
    };
  }, []);

  // En el servidor no hay document: se monta después de la hidratación.
  if (!montado) return null;
  return createPortal(children, document.body);
}
