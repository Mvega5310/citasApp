'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Campo numérico que se deja borrar.
 *
 * Con un `<input type="number" value={n}>` atado a un número, borrar el
 * contenido lo convierte en 0 al instante y el campo se vuelve a pintar con
 * "0": el cero no se puede quitar, y para escribir una cifra hay que mover el
 * cursor y teclear encima. En un teléfono eso es una pelea.
 *
 * Aquí el texto que se está escribiendo vive aparte del número. Mientras el
 * campo está enfocado puede quedar vacío; al salir se normaliza y se avisa del
 * valor definitivo. Además al enfocarlo se selecciona todo, así la primera
 * tecla reemplaza lo que había en vez de añadirse.
 */
export default function CampoNumero({
  value,
  onChange,
  min = 0,
  max,
  step,
  className = '',
  disabled,
  id,
  'aria-label': ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}) {
  const [texto, setTexto] = useState(String(value));
  const enfocado = useRef(false);

  // Si el valor cambia desde fuera (cargar, descartar, renovar), se refleja —
  // pero nunca mientras se escribe, o pisaría lo que se está tecleando.
  useEffect(() => {
    if (!enfocado.current) setTexto(String(value));
  }, [value]);

  const acotar = (n: number) => {
    const conMin = Math.max(min, n);
    return max === undefined ? conMin : Math.min(max, conMin);
  };

  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={className}
      value={texto}
      onFocus={(e) => {
        enfocado.current = true;
        // En iOS, seleccionar dentro del propio evento de foco a veces no
        // surte efecto; aplazarlo un tick lo hace fiable.
        const el = e.currentTarget;
        setTimeout(() => el.select(), 0);
      }}
      onChange={(e) => {
        const bruto = e.target.value;
        setTexto(bruto);
        // Vacío mientras escribe: no se avisa todavía, para no reponer el 0
        // debajo de los dedos. Se resuelve al salir del campo.
        if (bruto === '') return;
        const n = Number(bruto);
        if (Number.isFinite(n)) onChange(acotar(Math.round(n)));
      }}
      onBlur={() => {
        enfocado.current = false;
        const n = Number(texto);
        const definitivo = texto === '' || !Number.isFinite(n) ? min : acotar(Math.round(n));
        setTexto(String(definitivo));
        if (definitivo !== value) onChange(definitivo);
      }}
    />
  );
}
