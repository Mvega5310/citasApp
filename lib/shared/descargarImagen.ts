/**
 * Guarda una imagen sin sacar a la persona de la página.
 *
 * Antes era un `<a href="/api/qr?descargar=1" download>`, que **navega**: el
 * documento se va a la URL del archivo. En el navegador normal casi no se
 * nota, pero dentro de la app instalada (PWA en `standalone`) no hay barra de
 * direcciones ni botón de atrás, así que la pantalla quedaba en negro y había
 * que cerrar la app y volver a abrirla. En escritorio pasaba lo mismo con el
 * diálogo abierto encima.
 *
 * Aquí la imagen se baja a memoria y se guarda desde ahí, así que el
 * documento nunca navega. En iOS se ofrece primero el panel del sistema
 * -que trae "Guardar imagen"- porque `download` sobre un blob no siempre
 * guarda nada ahí.
 */
export async function guardarImagen(url: string, nombreArchivo: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo obtener la imagen');
  const blob = await res.blob();

  const archivo = new File([blob], nombreArchivo, { type: blob.type || 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] });
    } catch {
      // Cerró el panel del sistema sin guardar: es una decisión suya, no un error.
    }
    return;
  }

  const enMemoria = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = enMemoria;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Dar tiempo a que el navegador lea el blob antes de soltarlo.
  setTimeout(() => URL.revokeObjectURL(enMemoria), 10_000);
}
