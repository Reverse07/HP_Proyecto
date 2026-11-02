DROP SCHEMA IF EXISTS terra_brasa CASCADE;
CREATE SCHEMA terra_brasa;
SET search_path TO terra_brasa;

CREATE TABLE restaurante (
    id_restaurante  SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    direccion       VARCHAR(150) NOT NULL,
    telefono        VARCHAR(20),
    correo          VARCHAR(100)
);

CREATE TABLE cliente (
    id_cliente   SERIAL PRIMARY KEY,
    nombres      VARCHAR(80)  NOT NULL,
    apellidos    VARCHAR(80)  NOT NULL,
    correo       VARCHAR(100) NOT NULL UNIQUE,
    telefono     VARCHAR(20),
    contrasena   VARCHAR(255) NOT NULL,
    rol          VARCHAR(20)  NOT NULL DEFAULT 'cliente'
                 CHECK (rol IN ('cliente','administrador','personal'))
);

CREATE TABLE mesa (
    id_mesa         SERIAL PRIMARY KEY,
    id_restaurante  INT NOT NULL REFERENCES restaurante(id_restaurante),
    numero_mesa     INT NOT NULL,
    capacidad       INT NOT NULL CHECK (capacidad > 0),
    ubicacion       VARCHAR(50),
    estado          VARCHAR(20) NOT NULL DEFAULT 'Disponible'
                    CHECK (estado IN ('Disponible','No disponible')),
    UNIQUE (id_restaurante, numero_mesa)
);

CREATE TABLE horario (
    id_horario      SERIAL PRIMARY KEY,
    id_restaurante  INT NOT NULL REFERENCES restaurante(id_restaurante),
    dia_semana      VARCHAR(10) NOT NULL,
    hora_apertura   TIME NOT NULL,
    hora_cierre     TIME NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'Activo',
    CHECK (hora_cierre > hora_apertura)
);

CREATE TABLE categoria (
    id_categoria  SERIAL PRIMARY KEY,
    nombre        VARCHAR(60) NOT NULL UNIQUE,
    descripcion   VARCHAR(150)
);

CREATE TABLE platillo (
    id_platillo      SERIAL PRIMARY KEY,
    id_categoria     INT NOT NULL REFERENCES categoria(id_categoria),
    nombre           VARCHAR(100) NOT NULL,
    descripcion      VARCHAR(200),
    precio           NUMERIC(8,2) NOT NULL CHECK (precio >= 0),
    ingredientes     VARCHAR(250),
    disponibilidad   BOOLEAN NOT NULL DEFAULT TRUE,
    estado           VARCHAR(20) NOT NULL DEFAULT 'Activo',
    permite_coccion  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE menu_diario (
    id_menu         SERIAL PRIMARY KEY,
    id_restaurante  INT NOT NULL REFERENCES restaurante(id_restaurante),
    fecha           DATE NOT NULL,
    nombre          VARCHAR(80) NOT NULL,
    descripcion     VARCHAR(150),
    estado          VARCHAR(20) NOT NULL DEFAULT 'Activo'
);

CREATE TABLE menu_platillo (
    id_menu_plat  SERIAL PRIMARY KEY,
    id_menu       INT NOT NULL REFERENCES menu_diario(id_menu) ON DELETE CASCADE,
    id_platillo   INT NOT NULL REFERENCES platillo(id_platillo),
    UNIQUE (id_menu, id_platillo)
);

CREATE TABLE reserva (
    id_reserva         SERIAL PRIMARY KEY,
    id_cliente         INT NOT NULL REFERENCES cliente(id_cliente),
    id_mesa            INT NOT NULL REFERENCES mesa(id_mesa),
    id_restaurante     INT NOT NULL REFERENCES restaurante(id_restaurante),
    fecha_reserva      DATE NOT NULL,
    hora_reserva       TIME NOT NULL,
    numero_asistentes  INT  NOT NULL CHECK (numero_asistentes > 0),
    estado_reserva     VARCHAR(25) NOT NULL DEFAULT 'Pendiente de pago'
                       CHECK (estado_reserva IN ('Pendiente de pago','Pagada','Confirmada','Cancelada')),
    codigo_reserva     VARCHAR(12) NOT NULL UNIQUE,
    creado_en          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_mesa_fecha_hora
    ON reserva (id_mesa, fecha_reserva, hora_reserva)
    WHERE estado_reserva <> 'Cancelada';
CREATE INDEX ix_reserva_fecha_hora ON reserva (fecha_reserva, hora_reserva);
CREATE INDEX ix_reserva_cliente ON reserva (id_cliente);

CREATE TABLE pedido (
    id_pedido     SERIAL PRIMARY KEY,
    id_reserva    INT NOT NULL REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    fecha_pedido  TIMESTAMP NOT NULL DEFAULT now(),
    estado        VARCHAR(20) NOT NULL DEFAULT 'Registrado'
                  CHECK (estado IN ('Registrado','En preparación','Entregado','Completado')),
    subtotal      NUMERIC(10,2) NOT NULL DEFAULT 0,
    total         NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE detalle_pedido (
    id_detalle       SERIAL PRIMARY KEY,
    id_pedido        INT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    id_platillo      INT NOT NULL REFERENCES platillo(id_platillo),
    cantidad         INT NOT NULL CHECK (cantidad > 0),
    precio_unitario  NUMERIC(8,2) NOT NULL,
    subtotal         NUMERIC(10,2) NOT NULL,
    termino_coccion  VARCHAR(30),
    observaciones    VARCHAR(200)
);

CREATE TABLE preferencia_cliente (
    id_preferencia  SERIAL PRIMARY KEY,
    id_reserva      INT NOT NULL REFERENCES reserva(id_reserva) ON DELETE CASCADE
);

CREATE TABLE alergia (
    id_alergia      SERIAL PRIMARY KEY,
    id_preferencia  INT NOT NULL REFERENCES preferencia_cliente(id_preferencia) ON DELETE CASCADE,
    nombre          VARCHAR(80) NOT NULL,
    descripcion     VARCHAR(150)
);

CREATE TABLE restriccion_alimentaria (
    id_restriccion  SERIAL PRIMARY KEY,
    id_preferencia  INT NOT NULL REFERENCES preferencia_cliente(id_preferencia) ON DELETE CASCADE,
    nombre          VARCHAR(80) NOT NULL,
    descripcion     VARCHAR(150)
);

CREATE TABLE preferencia_coccion (
    id_preferencia_coccion  SERIAL PRIMARY KEY,
    id_preferencia          INT NOT NULL REFERENCES preferencia_cliente(id_preferencia) ON DELETE CASCADE,
    nombre                  VARCHAR(50) NOT NULL,
    descripcion             VARCHAR(150)
);

CREATE TABLE pago (
    id_pago      SERIAL PRIMARY KEY,
    id_reserva   INT NOT NULL REFERENCES reserva(id_reserva),
    monto        NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    metodo_pago  VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('Tarjeta','Yape')),
    fecha_pago   TIMESTAMP NOT NULL DEFAULT now(),
    estado       VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
                 CHECK (estado IN ('Pendiente','Aprobado','Rechazado'))
);

CREATE TABLE confirmacion_email (
    id_confirmacion  SERIAL PRIMARY KEY,
    id_reserva       INT NOT NULL REFERENCES reserva(id_reserva),
    correo           VARCHAR(100) NOT NULL,
    fecha_envio      TIMESTAMP,
    estado           VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
                     CHECK (estado IN ('Pendiente','Enviado','Error'))
);
