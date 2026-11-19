-- 010 · Rellenar los precios que faltaban, dejando constancia
--
-- El precio se guarda dentro de cada cita al reservar, y esa columna llegó con
-- la migración 005. Las citas anteriores quedaron en nulo, así que el cierre
-- mostraba $0 facturado para una semana con 25 citas completadas: el informe
-- no inventa precios, y hacía bien.
--
-- Marcos pidió rellenarlas con el catálogo actual. Eso **no es el precio que
-- se cobró**: es una reconstrucción. Por eso no basta con escribir el número,
-- hay que poder distinguirlo después — si no, en seis meses nadie sabrá qué
-- cifras se midieron y cuáles se dedujeron.
--
-- De ahí la columna `price_estimado`. Las citas nuevas la dejan en false, que
-- es la verdad: su precio se capturó en el momento de reservar.

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS price_estimado boolean NOT NULL DEFAULT false;

-- Solo donde falta el precio y el servicio sigue en el catálogo. Una cita de
-- un servicio ya borrado se queda sin precio: inventarle uno sería peor que
-- dejarla fuera del total.
UPDATE appointments a
   SET price = s.price,
       price_estimado = true
  FROM services s
 WHERE s.tenant_id = a.tenant_id
   AND s.id = a.service_id
   AND a.price IS NULL;
