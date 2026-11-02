SET search_path TO terra_brasa;

INSERT INTO restaurante (nombre, direccion, telefono, correo)
VALUES ('Terra & Brasa', 'Av. Principal 123, Lima', '999888777', 'reservas@terrabrasa.pe');

INSERT INTO cliente (nombres, apellidos, correo, telefono, contrasena, rol)
VALUES
  ('Ana', 'Torres Rojas', 'ana.torres@correo.com', '912345678', '$2b$10$QwKXk3zEwQu8w7RXmJ38Q.5oXsG7E4wVNd3ZK8b0nA1Yw.0tGKWQ2', 'cliente'),
  ('Administrador', 'Sistema', 'admin@terrabrasa.pe', '900000000', '$2b$10$QwKXk3zEwQu8w7RXmJ38Q.5oXsG7E4wVNd3ZK8b0nA1Yw.0tGKWQ2', 'administrador'),
  ('Cocina', 'Terra', 'cocina@terrabrasa.pe', '911111111', '$2b$10$QwKXk3zEwQu8w7RXmJ38Q.5oXsG7E4wVNd3ZK8b0nA1Yw.0tGKWQ2', 'personal');

INSERT INTO horario (id_restaurante, dia_semana, hora_apertura, hora_cierre, estado)
VALUES
  (1, 'Lunes', '12:00', '23:00', 'Activo'),
  (1, 'Martes', '12:00', '23:00', 'Activo'),
  (1, 'Miércoles', '12:00', '23:00', 'Activo'),
  (1, 'Jueves', '12:00', '23:00', 'Activo'),
  (1, 'Viernes', '12:00', '23:00', 'Activo'),
  (1, 'Sábado', '12:00', '23:00', 'Activo'),
  (1, 'Domingo', '12:00', '23:00', 'Activo');

INSERT INTO mesa (id_restaurante, numero_mesa, capacidad, ubicacion, estado)
VALUES
  (1, 1, 2, 'Salón', 'Disponible'),
  (1, 2, 2, 'Salón', 'Disponible'),
  (1, 3, 4, 'Salón', 'Disponible'),
  (1, 4, 4, 'Salón', 'Disponible'),
  (1, 5, 6, 'Salón', 'Disponible'),
  (1, 6, 6, 'Salón', 'Disponible'),
  (1, 7, 4, 'Terraza', 'Disponible'),
  (1, 8, 8, 'Terraza', 'Disponible');

INSERT INTO categoria (nombre, descripcion)
VALUES
  ('Parrillas', 'Especialidades a la brasa'),
  ('Platos de fondo', 'Platos contundentes'),
  ('Entradas', 'Para comenzar'),
  ('Postres', 'Finales dulces'),
  ('Bebidas', 'Complementos');

INSERT INTO platillo (id_categoria, nombre, descripcion, precio, ingredientes, disponibilidad, estado, permite_coccion)
VALUES
  (1, 'Lomo a la brasa', 'Lomo jugoso a la brasa', 48.00, 'Lomo, sal, hierbas', TRUE, 'Activo', TRUE),
  (1, 'Pesca del día', 'Pescado del día a la plancha', 46.00, 'Pescado, limón', TRUE, 'Activo', TRUE),
  (2, 'Risotto de hongos', 'Risotto cremoso con hongos', 39.00, 'Arroz, hongos, queso', TRUE, 'Activo', FALSE),
  (3, 'Ensalada fresca', 'Ensalada con vegetales', 18.00, 'Lechuga, tomate', TRUE, 'Activo', FALSE),
  (4, 'Tarta de cacao', 'Tarta de cacao artesanal', 22.00, 'Cacao, harina, crema', TRUE, 'Activo', FALSE),
  (5, 'Limonada natural', 'Limonada fresca', 12.00, 'Limón, agua, azúcar', TRUE, 'Activo', FALSE),
  (1, 'Churrasco de res', 'Churrasco de res premium', 52.00, 'Res, sal', TRUE, 'Activo', TRUE),
  (2, 'Causa limeña', 'Causa verde con pollo', 28.00, 'Papa, ají, pollo', TRUE, 'Activo', FALSE),
  (3, 'Tequeños', 'Tequeños con queso', 20.00, 'Queso, masa', TRUE, 'Activo', FALSE),
  (4, 'Flan casero', 'Flan con caramelo', 19.00, 'Huevos, leche', TRUE, 'Activo', FALSE),
  (5, 'Chicha morada', 'Bebida tradicional', 10.00, 'Maíz morado', TRUE, 'Activo', FALSE),
  (1, 'Brocheta de pollo', 'Brocheta con verduras', 35.00, 'Pollo, verduras', FALSE, 'Inactivo', TRUE);

INSERT INTO menu_diario (id_restaurante, fecha, nombre, descripcion, estado)
SELECT 1, CURRENT_DATE + n, 'Carta del día', 'Menú principal del restaurante', 'Activo'
FROM generate_series(0, 13) AS g(n);

INSERT INTO menu_platillo (id_menu, id_platillo)
SELECT id_menu, id_platillo
FROM menu_diario md
CROSS JOIN platillo p
WHERE md.fecha >= CURRENT_DATE
  AND md.fecha <= CURRENT_DATE + 13;

INSERT INTO reserva (id_cliente, id_mesa, id_restaurante, fecha_reserva, hora_reserva, numero_asistentes, estado_reserva, codigo_reserva, creado_en)
VALUES (1, 7, 1, CURRENT_DATE + 1, '20:30:00', 4, 'Confirmada', 'TB-0142', NOW());

INSERT INTO pedido (id_reserva, estado, subtotal, total)
VALUES (1, 'Completado', 94.00, 94.00);

INSERT INTO detalle_pedido (id_pedido, id_platillo, cantidad, precio_unitario, subtotal, termino_coccion, observaciones)
VALUES
  (1, 1, 1, 48.00, 48.00, 'Al punto', 'Sin cebolla'),
  (1, 2, 1, 46.00, 46.00, 'Al punto', '');

INSERT INTO preferencia_cliente (id_reserva)
VALUES (1);

INSERT INTO alergia (id_preferencia, nombre, descripcion)
VALUES (1, 'Frutos secos', 'No consumir frutos secos');

INSERT INTO restriccion_alimentaria (id_preferencia, nombre, descripcion)
VALUES (1, 'Sin lactosa', 'Sin productos lácteos');

INSERT INTO preferencia_coccion (id_preferencia, nombre, descripcion)
VALUES (1, 'Al punto', 'Cocción media');

INSERT INTO pago (id_reserva, monto, metodo_pago, fecha_pago, estado)
VALUES (1, 94.00, 'Yape', NOW(), 'Aprobado');

INSERT INTO confirmacion_email (id_reserva, correo, fecha_envio, estado)
VALUES (1, 'ana.torres@correo.com', NOW(), 'Enviado');
