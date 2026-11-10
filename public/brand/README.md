# Marca de la plataforma (BeautyTurno)

Símbolo de la **plataforma**, no de ninguna barbería. El logo de cada negocio es
otra cosa y hoy vive en `public/LogoBr.jpg`, servido por `/api/logo`.

| Archivo | Para qué |
|---|---|
| `beautyturno-mark.svg` | Fondos oscuros. Es el de uso normal: la app es oscura. |
| `beautyturno-mark-light.svg` | Fondos claros. El oro se oscurece para que no quede lavado. **Este es el de los correos**, que se leen sobre blanco. |
| `beautyturno-mark-mono.svg` | Un solo color, tomado de `currentColor`. Para favicon y donde no se pueda elegir color. |

## Cómo está construido

Lienzo de 100×100 con el símbolo centrado. El aro lleva un trazo del **7% del
ancho**: a 36 px eso son 2,5 px reales, que es el mínimo para que una línea se
dibuje nítida. Las hojas son formas macizas, sin contorno ni calado interior,
porque cualquier detalle por debajo de 1 px desaparece al reducir.

**Sin degradados.** A tamaño pequeño se bandean, y además impiden la versión de
un solo color.

## Al exportar a PNG

Cuadrado, y con estos tamaños: 1024, 512, 192, 180 y 32. Antes de dar por buena
una exportación, **mírala a 36 px**: es el tamaño al que se usa en la barra del
panel, y es donde se cae cualquier marca con detalle fino.

## Dónde NO va

No reemplaza `public/LogoBr.jpg`. Ese hueco es el logo del negocio y aparece en
el encabezado del cliente, en la barra del panel y en el login, siempre
etiquetado con el nombre de la barbería. Poner aquí la marca de la plataforma
haría que los clientes de un negocio vieran un símbolo que no es el suyo.
