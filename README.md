# Polaris

## Descripción del proyecto

**Polaris** es una tienda virtual de venta de ropa y otros objetos, desarrollada como proyecto de formación.

El proyecto permite a los usuarios consultar productos, registrarse, iniciar sesión, gestionar su perfil, agregar productos al carrito, administrar favoritos, realizar búsquedas y consultar reseñas.

Además, cuenta con un sistema de administración que permite gestionar productos, usuarios, stock y cupones de descuento.

El proyecto está desarrollado utilizando tecnologías web como **HTML, CSS y JavaScript** en el frontend, y **Node.js con Express** en el backend, conectado a una base de datos **MySQL**.

---

## Tecnologías utilizadas

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js

### Base de datos

- MySQL

### Herramientas

- Visual Studio Code
- Git
- GitHub

---

## Estructura del proyecto

```text
Polaris/
│
├── backend/
│   ├── app.js
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/
│
├── html/
│   | inicio.html
|   | Portada.html
│   | Registri.html
│   | Productos.html
│   | detalleproducto.html
│   | contacto.html
│   | Actualizar.html
│   | perfil.html
│   | favoritos.html
│   | admin.html
|   | vendedor.html
│
├── css styles/
│   └── Archivos CSS del proyecto
│
├── javascript/
│   └── script.js
│
├── img/
│   └── Imágenes de los productos
│
├── .gitignore
└── README.md
```

---

## Funcionamiento del proyecto

Polaris utiliza una arquitectura dividida en frontend, backend y base de datos.

### Frontend

El frontend está desarrollado con HTML, CSS y JavaScript.

Desde esta parte los usuarios pueden interactuar con la tienda, consultar productos, iniciar sesión, utilizar el carrito y acceder a las diferentes funcionalidades disponibles.

### Backend

El backend está desarrollado con Node.js y Express.

El archivo principal es:

```text
backend/app.js
```

Este archivo se encarga de:

- Iniciar el servidor.
- Conectarse a MySQL.
- Crear las rutas de la aplicación.
- Recibir solicitudes del frontend.
- Consultar y modificar información de la base de datos.
- Gestionar usuarios.
- Gestionar productos.
- Gestionar carrito.
- Gestionar favoritos.
- Gestionar reseñas.
- Gestionar funciones administrativas.
- Gestionar cupones.

Actualmente el servidor funciona mediante:

```text
http://localhost:8080
```

---

# Base de datos

El proyecto utiliza una base de datos MySQL llamada:

```text
polaris
```

Entre las tablas utilizadas actualmente se encuentran:

- `usuarios`
- `productos`
- `carrito`
- `detalle_carrito`
- `favoritos`
- `reseñas`
- `cupones`

Las tablas están relacionadas mediante identificadores y claves foráneas cuando es necesario.

---

# Usuarios

El sistema cuenta con:

- Registro de usuarios.
- Inicio de sesión.
- Identificación del usuario mediante `id_usuario`.
- Perfil de usuario.
- Actualización de contraseña.
- Sistema de roles.
- Rol de administrador.

El sistema utiliza el rol del usuario para determinar si puede acceder al panel administrativo.

---

# Productos

El sistema permite:

- Consultar productos.
- Mostrar nombre.
- Mostrar descripción.
- Mostrar precio.
- Mostrar imagen.
- Mostrar stock.
- Buscar productos.
- Consultar detalles de un producto.
- Administrar productos desde el panel administrativo.

Las imágenes de los productos se almacenan en:

```text
img/
```

y el nombre de la imagen se relaciona con el campo correspondiente en la base de datos.

---

# Carrito de compras

Cada usuario posee su propio carrito.

El sistema permite:

- Agregar productos.
- Aumentar cantidades.
- Disminuir cantidades.
- Eliminar productos.
- Consultar el carrito.
- Mantener separado el carrito de cada usuario.

Las principales tablas relacionadas son:

```text
carrito
detalle_carrito
productos
usuarios
```

---

# Favoritos

Los usuarios pueden agregar y eliminar productos de su lista de favoritos.

Esta funcionalidad permite mantener una lista de productos que el usuario desea consultar posteriormente.

---

# Reseñas

Los usuarios pueden realizar reseñas sobre los productos.

El sistema permite:

- Agregar una calificación.
- Registrar una reseña.
- Consultar las reseñas de un producto.
- Eliminar reseñas cuando corresponde.

Las calificaciones utilizan una escala de:

```text
1 a 5
```

---

# Panel de administración

El proyecto cuenta con un panel exclusivo para usuarios con rol de administrador.

Desde este panel se pueden gestionar diferentes elementos de la tienda:

### Productos

- Crear productos.
- Editar productos.
- Eliminar productos.
- Consultar productos.

### Usuarios

- Consultar usuarios.
- Editar información permitida.
- Eliminar usuarios.

### Stock

- Consultar stock.
- Actualizar cantidades disponibles.

### Cupones

- Crear cupones.
- Editar cupones.
- Eliminar cupones.
- Asociar un cupón a un producto específico.
- Definir el porcentaje de descuento.

---

# Sistema de cupones

El proyecto cuenta con un sistema de cupones asociado a productos específicos.

Cada cupón contiene:

- Código.
- Porcentaje de descuento.
- Producto asociado.
- Fecha de creación.

La tabla utilizada es:

```text
cupones
```

Los cupones son administrados desde el panel administrativo.

---

## Solicitudes

El vendedor realiza una solicitud para ingresar a la aplicacion por primera vez y para agregar o vender productos.

El administrador tiene la decision de analizar y aceptar o rechazar

---

# Principales funcionalidades del backend

Entre las rutas implementadas actualmente se encuentran funcionalidades relacionadas con:

- Registro.
- Inicio de sesión.
- Usuarios.
- Vendedor
- Perfil.
- Actualización de contraseña.
- Productos.
- Búsqueda de productos.
- Carrito.
- Favoritos.
- Solicitudes
- Reseñas.
- Administración.
- Stock.
- Cupones.

---

# Instalación y ejecución

## 1. Clonar el proyecto

Descargar o clonar el repositorio de Polaris.

## 2. Instalar dependencias

Desde la carpeta del backend:

```bash
cd backend
npm install
```

## 3. Configurar MySQL

Crear la base de datos:

```text
polaris
```

y configurar las tablas necesarias.

## 4. Iniciar el servidor

Desde `backend`:

```bash
node app.js
```

El servidor se ejecutará en:

```text
http://localhost:8080
```

---

# Pruebas

Durante el desarrollo se han realizado pruebas de diferentes funcionalidades, entre ellas:

- Actualización de contraseña.
- Funcionamiento del carrito.
- Búsqueda de productos.
- Registro e inicio de sesión.
- Funciones administrativas.
- Gestión de productos.
- Gestión de stock.
- Sistema de cupones.

---

# Próximas funcionalidades

Entre las funcionalidades planeadas para futuras versiones se encuentran:

- Sistema de pedidos.
- Proceso de compra.
- Integración de pagos.
- Mejoras visuales y de experiencia de usuario.
- Despliegue del proyecto en Internet mediante HTTPS.
- Adaptación o desarrollo de una aplicación para Android.

---

# Autor

Proyecto desarrollado como parte del proceso de formación en desarrollo de software.

**Polaris — Tienda virtual de venta de ropa y otros objetos.**
