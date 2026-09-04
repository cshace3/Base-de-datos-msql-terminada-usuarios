let productosDisponibles = [];

//Funcion Registrar
async function registrar(event) {
  if (event) event.preventDefault();
  let usuario = document.getElementById("usuario").value;
  let fecha = document.getElementById("fecha").value;
  let correo = document.getElementById("correo").value;
  let contraseña = document.getElementById("contraseña").value;
  let mensaje = document.getElementById("mensaje");

  //Validar campos
  if (usuario === "" || fecha === "" || correo === "" || contraseña === "") {
    mensaje.textContent = "Todos los campos obligatorios";
    mensaje.style.color = "red";
    return;
  }

  //Validar correo
  let valCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!valCorreo.test(correo)) {
    mensaje.textContent = "Correo inválido";
    mensaje.style.color = "red";
    return;
  }

  //Guardar datos
  try {
    const respuesta = await fetch("/registro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usuario,
        correo,
        contraseña,
      }),
    });

    const datos = await respuesta.json();
    if (datos.ok) {
      document.getElementById("mensaje").textContent = "Registro exitoso";
      document.getElementById("mensaje").style.color = "green";
      setTimeout(() => {
        window.location.href = "Productos.html";
      }, 2000);
    } else {
      document.getElementById("mensaje").textContent = "No se pudo registrar";
      document.getElementById("mensaje").style.color = "red";
    }
  } catch (err) {
    document.getElementById("mensaje").textContent =
      "Error al conectar con el servidor";
    document.getElementById("mensaje").style.color = "red";
  }
}

//Inicio sesion
async function iniciar(event) {
  if (event) event.preventDefault();
  let usuario = document.getElementById("usuario").value;
  let correo = document.getElementById("correo").value;
  let contraseña = document.getElementById("contraseña").value;

  let mensaje = document.getElementById("mensaje");
  //Limpiar mensaje
  mensaje.textContent = "";

  //Validar campos
  if (usuario === "" || correo === "" || contraseña === "") {
    mensaje.textContent = "Todos los campos obligatorios";
    mensaje.style.color = "red";
    return;
  }

  //Validar correo
  let valCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!valCorreo.test(correo)) {
    mensaje.textContent = "Correo inválido";
    mensaje.style.color = "red";
    return;
  }

  try {
    const respuesta = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usuario,
        correo,
        contraseña,
      }),
    });

    const datos = await respuesta.json();
    if (datos.ok) {
      console.log("DATOS DEL LOGIN:", datos);

      localStorage.setItem("id_usuario", datos.id_usuario);
      localStorage.setItem("usuario", datos.usuario);

      document.getElementById("mensaje").textContent =
        "Inicio de sesión exitoso";
      document.getElementById("mensaje").style.color = "green";

      setTimeout(() => {
        window.location.href = "Productos.html";
      }, 2000);
    } else {
      document.getElementById("mensaje").textContent =
        "Correo o contraseña incorrectos";
      document.getElementById("mensaje").style.color = "red";
    }
  } catch (err) {
    document.getElementById("mensaje").textContent =
      "Error al conectar con el servidor";
    document.getElementById("mensaje").style.color = "red";
  }
}

//Actualizar datos
const formActualizar = document.getElementById("foActualizar");
if (formActualizar) {
  formActualizar.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const correo = document.getElementById("correo").value;
    const actual = document.getElementById("actual").value;
    const nueva = document.getElementById("nueva").value;
    const confirmar = document.getElementById("confirmar").value;

    if (nueva !== confirmar) {
      alert("Las contraseñas no coinciden");
      return;
    }

    const respuesta = await fetch("/actualizar-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usuario,
        correo,
        actual,
        nueva,
      }),
    });

    const datos = await respuesta.json();
    //Mensaje

    const mensaje = document.getElementById("mensajeactualizar");

    mensaje.textContent = datos.mensaje;

    if (datos.mensaje === "Contraseña actualizada correctamente") {
      mensaje.style.color = "green";

      setTimeout(() => {
        window.location.href = "/inicio.html";
      }, 1500);
    } else {
      mensaje.style.color = "red";
    }
  });
}
// Cargar productos desde MySQL
async function cargarProductos() {
  try {
    const respuesta = await fetch("/productos");
    const productos = await respuesta.json();

    productosDisponibles = productos;

    const contenedor = document.getElementById("lista-productos");

    contenedor.innerHTML = "";

    let favoritosSet = new Set();
    const usuarioId = localStorage.getItem("id_usuario");
    if (usuarioId) {
      try {
        const resFav = await fetch(`/favoritos/${usuarioId}`);
        const favData = await resFav.json();
        if (favData.ok && Array.isArray(favData.favoritos)) {
          favData.favoritos.forEach((f) => favoritosSet.add(f.producto_id));
        }
      } catch (e) {
        console.error("Error al obtener favoritos iniciales:", e);
      }
    }

    productos.forEach((producto) => {
      const div = document.createElement("div");
      div.classList.add("contenedor");

      const esFav = favoritosSet.has(producto.id);

      div.innerHTML = `
    <img
        class="imagen-1"
        src="/img/${producto.imagen}"
        onclick="verDetalleProducto(${producto.id})"
        style="cursor: pointer;"
    >

    <h2
        onclick="verDetalleProducto(${producto.id})"
        style="cursor: pointer;"
    >
        ${producto.nombre}
    </h2>

    <p>${producto.descripcion || ""}</p>

    <p>$${Number(producto.precio).toLocaleString("es-CO")}</p>

    <div class="acciones-producto">
        <button class="btn-agregar-carrito" onclick="agregarCarrito(${producto.id}, event)">
            <i class="fa-solid fa-cart-shopping"></i> Agregar al carrito
        </button>
        <button
            class="boton-favorito"
            onclick="cambiarFavorito(${producto.id}, this)"
            title="${esFav ? "Quitar de favoritos" : "Agregar a favoritos"}"
        >
            ${esFav ? "❤️" : "🤍"}
        </button>
    </div>

    <p class="mensaje"></p>
`;

      contenedor.appendChild(div);
    });
  } catch (error) {
    console.error("Error al cargar los productos:", error);
  }
}

async function cambiarFavorito(idProducto, boton) {
  const usuarioId = localStorage.getItem("id_usuario");

  if (!usuarioId) {
    alert("Debes iniciar sesión para agregar favoritos.");
    return;
  }

  const esFavorito = boton.textContent.trim() === "❤️";

  if (esFavorito) {
    const respuesta = await fetch(`/favoritos/${usuarioId}/${idProducto}`, {
      method: "DELETE",
    });

    const datos = await respuesta.json();

    if (datos.ok) {
      boton.textContent = "🤍";
      boton.title = "Agregar a favoritos";
    }
  } else {
    const respuesta = await fetch("/favoritos/agregar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usuario_id: usuarioId,
        producto_id: idProducto,
      }),
    });

    const datos = await respuesta.json();

    if (datos.ok) {
      boton.textContent = "❤️";
      boton.title = "Quitar de favoritos";
    } else {
      alert(datos.mensaje);
    }
  }
}
//Buscar productos
function buscarProducto() {
  const texto = document
    .getElementById("buscarProducto")
    .value.trim()
    .toLowerCase();

  const contenedor = document.getElementById("lista-productos");

  if (texto === "") {
    cargarProductos();
    return;
  }

  const resultados = productosDisponibles.filter(
    (producto) =>
      producto.nombre.toLowerCase().includes(texto) ||
      (producto.descripcion &&
        producto.descripcion.toLowerCase().includes(texto)),
  );

  contenedor.innerHTML = "";

  if (resultados.length === 0) {
    contenedor.innerHTML = `
            <p class="no-encontrado">
                No hay productos que coincidan con "${texto}".
            </p>
        `;

    return;
  }

  resultados.forEach((producto) => {
    const div = document.createElement("div");

    div.classList.add("contenedor");

    div.innerHTML = `
    <img
        class="imagen-1"
        src="/img/${producto.imagen}"
        onclick="verDetalleProducto(${producto.id})"
        style="cursor: pointer;"
    >

    <h2
        onclick="verDetalleProducto(${producto.id})"
        style="cursor: pointer;"
    >
        ${producto.nombre}
    </h2>

    <p>${producto.descripcion}</p>

    <p>$${Number(producto.precio).toLocaleString("es-CO")}</p>

    <button onclick="agregarCarrito(${producto.id}, event)">
        Agregar al carrito
    </button>

    <p class="mensaje"></p>
`;

    contenedor.appendChild(div);
  });
}
//Agregar al Carrito
async function agregarCarrito(idProducto, ev) {
  const idUsuario = localStorage.getItem("id_usuario");

  if (!idUsuario) {
    alert("Debes iniciar sesión para agregar productos al carrito.");
    return;
  }

  // Buscar el botón que fue presionado
  const eventObj = ev || (typeof event !== "undefined" ? event : null);
  const boton = eventObj ? eventObj.target : null;
  const contenedorProducto = boton ? boton.parentElement : null;
  const mensaje = contenedorProducto
    ? contenedorProducto.querySelector(".mensaje")
    : null;

  try {
    const respuesta = await fetch("/carrito/agregar", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        usuario_id: idUsuario,
        producto_id: idProducto,
        cantidad: 1,
      }),
    });

    const datos = await respuesta.json();

    if (datos.ok) {
      if (mensaje) {
        mensaje.textContent = "Producto agregado al carrito";
        mensaje.style.color = "green";
      }
    } else {
      if (mensaje) {
        mensaje.textContent = datos.mensaje || "No se pudo agregar el producto";
        mensaje.style.color = "red";
      }
    }
  } catch (error) {
    console.error("Error al agregar al carrito:", error);

    if (mensaje) {
      mensaje.textContent = "Error al conectar con el servidor";
      mensaje.style.color = "red";
    }
  }
}
//Carga el carrito
async function cargarCarrito() {
  const idUsuario = localStorage.getItem("id_usuario");

  if (!idUsuario) {
    alert("Debes iniciar sesión para ver tu carrito.");
    window.location.href = "Inicio.html";
    return;
  }

  try {
    const respuesta = await fetch(`/carrito/${idUsuario}`);

    const datos = await respuesta.json();

    const contenedor = document.getElementById("lista-carrito");

    contenedor.innerHTML = "";

    if (!datos.ok || datos.carrito.length === 0) {
      contenedor.innerHTML = "<p>Tu carrito está vacío.</p>";

      return;
    }

    let total = 0;

    datos.carrito.forEach((producto) => {
      const subtotal = Number(producto.precio) * producto.cantidad;

      total += subtotal;

      const div = document.createElement("div");

      div.classList.add("producto-carrito");

      div.innerHTML = `
    <img src="/img/${producto.imagen}" width="120">

    <div>
        <h2>${producto.nombre}</h2>

        <p>${producto.descripcion}</p>

        <p>Precio: $${Number(producto.precio).toLocaleString("es-CO")}</p>

        <div class="cantidad">
            <button onclick="disminuirCantidad(${producto.id})">−</button>

            <span>${producto.cantidad}</span>

            <button onclick="aumentarCantidad(${producto.id})">+</button>
        </div>

        <p>Subtotal: $${subtotal.toLocaleString("es-CO")}</p>

        <button onclick="eliminarProducto(${producto.id})">
            Eliminar
        </button>
    </div>
`;

      contenedor.appendChild(div);
    });

    document.getElementById("total-carrito").innerHTML = `
            <h2>Total: $${total.toLocaleString("es-CO")}</h2>
        `;
  } catch (error) {
    console.error("Error al cargar el carrito:", error);
  }
}
//Aumentar cantidad de productos
async function aumentarCantidad(idDetalle) {
  try {
    const respuesta = await fetch(
      `/carrito/${localStorage.getItem("id_usuario")}`,
    );

    const datos = await respuesta.json();

    const producto = datos.carrito.find((p) => p.id === idDetalle);

    if (!producto) return;

    await fetch(`/carrito/cantidad/${idDetalle}`, {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        cantidad: producto.cantidad + 1,
      }),
    });

    cargarCarrito();
  } catch (error) {
    console.error("Error al aumentar cantidad:", error);
  }
}
//Disminuir cantidad de productos
async function disminuirCantidad(idDetalle) {
  try {
    const respuesta = await fetch(
      `/carrito/${localStorage.getItem("id_usuario")}`,
    );

    const datos = await respuesta.json();

    const producto = datos.carrito.find((p) => p.id === idDetalle);

    if (!producto) return;

    if (producto.cantidad <= 1) {
      eliminarProducto(idDetalle);
      return;
    }

    await fetch(`/carrito/cantidad/${idDetalle}`, {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        cantidad: producto.cantidad - 1,
      }),
    });

    cargarCarrito();
  } catch (error) {
    console.error("Error al disminuir cantidad:", error);
  }
}
//Eliminar producto del carrito
async function eliminarProducto(idDetalle) {
  try {
    const respuesta = await fetch(`/carrito/producto/${idDetalle}`, {
      method: "DELETE",
    });

    const datos = await respuesta.json();

    if (datos.ok) {
      cargarCarrito();
    } else {
      alert(datos.mensaje);
    }
  } catch (error) {
    console.error("Error al eliminar producto:", error);
  }
}
//Carga el perfil del usuario
async function cargarPerfil() {
  const idUsuario = localStorage.getItem("id_usuario");

  if (!idUsuario) {
    alert("No hay una sesión iniciada");

    window.location.href = "inicio.html";

    return;
  }

  try {
    const respuesta = await fetch(`/perfil/${idUsuario}`);

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      alert("No se pudo cargar el perfil");

      return;
    }

    document.getElementById("usuario").textContent = datos.usuario;

    document.getElementById("correo").textContent = datos.correo;
  } catch (error) {
    console.error("Error:", error);

    alert("Error al conectar con el servidor");
  }
}
// Cargar detalle de un producto
async function cargarDetalleProducto() {
  const parametros = new URLSearchParams(window.location.search);

  const idProducto = parametros.get("id");

  const contenedor = document.getElementById("detalle-producto");

  if (!idProducto) {
    contenedor.innerHTML = `
            <p>No se especificó ningún producto.</p>
        `;

    return;
  }

  try {
    const respuesta = await fetch(`/productos/${idProducto}`);

    const datos = await respuesta.json();

    if (!datos.ok) {
      contenedor.innerHTML = `
                <p>${datos.mensaje}</p>
            `;

      return;
    }

    const producto = datos.producto;

    contenedor.innerHTML = `

            <div class="detalle-producto">

                <div class="detalle-imagen">

                    <img
                        src="/img/${producto.imagen}"
                        alt="${producto.nombre}"
                    >

                </div>


                <div class="detalle-informacion">

                    <h1>${producto.nombre}</h1>

                    <p class="detalle-descripcion">
                        ${producto.descripcion}
                    </p>

                    <h2 class="detalle-precio">
                        $${Number(producto.precio).toLocaleString("es-CO")}
                    </h2>

                    <p>
                        <strong>Stock disponible:</strong>
                        ${producto.stock}
                    </p>


                    <div class="selector-cantidad">

                        <button onclick="cambiarCantidad(-1)">
                            −
                        </button>

                        <span id="cantidad-producto">
                            1
                        </span>

                        <button onclick="cambiarCantidad(1)">
                            +
                        </button>

                    </div>


                    <button
                        class="boton-agregar-detalle"
                        onclick="agregarProductoDetalle(${producto.id})"
                    >
                        Agregar al carrito
                    </button>


                    <p id="mensaje-detalle"></p>

                </div>

            </div>

        `;

    window.stockProducto = producto.stock;
  } catch (error) {
    console.error("Error al cargar el detalle:", error);

    contenedor.innerHTML = `
            <p>Error al cargar el producto.</p>
        `;
  }
}

// Cambiar cantidad en el detalle
function cambiarCantidad(cambio) {
  const elemento = document.getElementById("cantidad-producto");

  if (!elemento) {
    return;
  }

  let cantidad = Number(elemento.textContent);

  cantidad += cambio;

  if (cantidad < 1) {
    cantidad = 1;
  }

  if (cantidad > window.stockProducto) {
    cantidad = window.stockProducto;
  }

  elemento.textContent = cantidad;
}

// Agregar al carrito desde el detalle
async function agregarProductoDetalle(idProducto) {
  const idUsuario = localStorage.getItem("id_usuario");

  if (!idUsuario) {
    alert("Debes iniciar sesión para agregar productos al carrito.");

    return;
  }

  const cantidad = Number(
    document.getElementById("cantidad-producto").textContent,
  );

  const mensaje = document.getElementById("mensaje-detalle");

  try {
    const respuesta = await fetch("/carrito/agregar", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        usuario_id: idUsuario,

        producto_id: idProducto,

        cantidad: cantidad,
      }),
    });

    const datos = await respuesta.json();

    if (datos.ok) {
      mensaje.textContent = "Producto agregado al carrito correctamente.";

      mensaje.style.color = "green";
    } else {
      mensaje.textContent = datos.mensaje || "No se pudo agregar el producto.";

      mensaje.style.color = "red";
    }
  } catch (error) {
    console.error("Error:", error);

    mensaje.textContent = "Error al conectar con el servidor.";

    mensaje.style.color = "red";
  }
}

// Cargar lista de favoritos del usuario
async function cargarFavoritos() {
  const contenedor = document.getElementById("lista-favoritos");
  if (!contenedor) return;

  const usuarioId = localStorage.getItem("id_usuario");

  if (!usuarioId) {
    contenedor.innerHTML = `
      <div class="mensaje-vacio">
        <i class="fa-solid fa-user-lock"></i>
        <p>Debes iniciar sesión para ver tus favoritos.</p>
        <a href="inicio.html">Iniciar Sesión</a>
      </div>
    `;
    return;
  }

  try {
    const respuesta = await fetch(`/favoritos/${usuarioId}`);
    const datos = await respuesta.json();

    if (!datos.ok || !datos.favoritos || datos.favoritos.length === 0) {
      contenedor.innerHTML = `
        <div class="mensaje-vacio">
          <i class="fa-solid fa-heart-crack"></i>
          <p>Aún no tienes productos agregados a favoritos.</p>
          <a href="Productos.html">Explorar Productos</a>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = "";

    datos.favoritos.forEach((producto) => {
      const div = document.createElement("div");
      div.classList.add("contenedor");

      div.innerHTML = `
        <img
            class="imagen-1"
            src="/img/${producto.imagen}"
            onclick="verDetalleProducto(${producto.producto_id})"
            style="cursor: pointer;"
        >

        <h2
            onclick="verDetalleProducto(${producto.producto_id})"
            style="cursor: pointer;"
        >
            ${producto.nombre}
        </h2>

        <p>${producto.descripcion || ""}</p>

        <p>$${Number(producto.precio).toLocaleString("es-CO")}</p>

        <div class="acciones-producto">
            <button class="btn-agregar-carrito" onclick="agregarCarrito(${producto.producto_id}, event)">
                <i class="fa-solid fa-cart-shopping"></i> Agregar al carrito
            </button>
            <button
                class="btn-eliminar-favorito"
                onclick="eliminarDeFavoritos(${producto.producto_id}, this)"
                title="Quitar de favoritos"
            >
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>

        <p class="mensaje"></p>
      `;

      contenedor.appendChild(div);
    });
  } catch (error) {
    console.error("Error al cargar los favoritos:", error);
    contenedor.innerHTML = `
      <div class="mensaje-vacio">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Ocurrió un error al cargar tus favoritos.</p>
      </div>
    `;
  }
}

// Eliminar producto de la vista de favoritos
async function eliminarDeFavoritos(idProducto, boton) {
  const usuarioId = localStorage.getItem("id_usuario");
  if (!usuarioId) return;

  try {
    const respuesta = await fetch(`/favoritos/${usuarioId}/${idProducto}`, {
      method: "DELETE",
    });
    const datos = await respuesta.json();

    if (datos.ok) {
      const tarjeta = boton.closest(".contenedor");
      if (tarjeta) {
        tarjeta.remove();
      }
      const contenedor = document.getElementById("lista-favoritos");
      if (contenedor && contenedor.children.length === 0) {
        contenedor.innerHTML = `
          <div class="mensaje-vacio">
            <i class="fa-solid fa-heart-crack"></i>
            <p>Aún no tienes productos agregados a favoritos.</p>
            <a href="Productos.html">Explorar Productos</a>
          </div>
        `;
      }
    } else {
      alert(datos.mensaje || "No se pudo eliminar de favoritos.");
    }
  } catch (err) {
    console.error("Error al eliminar favorito:", err);
  }
}
//Reseñas
let calificacionSeleccionada = 0;

function seleccionarCalificacion(calificacion) {
  calificacionSeleccionada = calificacion;

  const botones = document.querySelectorAll(".estrellas-calificacion button");

  botones.forEach((boton, indice) => {
    if (indice < calificacion) {
      boton.classList.add("activa");
    } else {
      boton.classList.remove("activa");
    }
    boton.classList.remove("hover");
  });

  const textoInfo = document.getElementById("calificacion-seleccionada");
  if (textoInfo) {
    if (calificacion > 0) {
      textoInfo.textContent = `Has seleccionado ${calificacion} de 5 estrellas`;
      textoInfo.classList.add("seleccionada");
    } else {
      textoInfo.textContent = "Selecciona una calificación";
      textoInfo.classList.remove("seleccionada");
    }
  }
}

function hoverCalificacion(calificacion) {
  const botones = document.querySelectorAll(".estrellas-calificacion button");
  botones.forEach((boton, indice) => {
    if (indice < calificacion) {
      boton.classList.add("hover");
    } else {
      boton.classList.remove("hover");
    }
  });
}

function resetHoverEstrellas() {
  const botones = document.querySelectorAll(".estrellas-calificacion button");
  botones.forEach((boton, indice) => {
    boton.classList.remove("hover");
    if (indice < calificacionSeleccionada) {
      boton.classList.add("activa");
    } else {
      boton.classList.remove("activa");
    }
  });
}

async function enviarResena() {
  const usuarioId = localStorage.getItem("id_usuario");
  const mensaje = document.getElementById("mensaje-resena");

  if (!usuarioId) {
    if (mensaje) {
      mensaje.textContent = "Debes iniciar sesión para publicar una reseña.";
      mensaje.className = "mensaje-alerta error";
    } else {
      alert("Debes iniciar sesión para publicar una reseña.");
    }
    return;
  }

  if (calificacionSeleccionada === 0) {
    if (mensaje) {
      mensaje.textContent =
        "Por favor selecciona de 1 a 5 estrellas para calificar.";
      mensaje.className = "mensaje-alerta error";
    } else {
      alert("Selecciona una calificación de 1 a 5 estrellas.");
    }
    return;
  }

  const parametros = new URLSearchParams(window.location.search);
  const productoId = parametros.get("id");

  if (!productoId) {
    if (mensaje) {
      mensaje.textContent =
        "No se encontró el id del producto que estás calificando.";
      mensaje.className = "mensaje-alerta error";
    }
    return;
  }

  const campoComentario = document.getElementById("comentario-resena");
  const comentario = campoComentario ? campoComentario.value.trim() : "";

  try {
    const respuesta = await fetch("/reseñas/agregar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usuario_id: Number(usuarioId),
        producto_id: Number(productoId),
        calificacion: calificacionSeleccionada,
        comentario: comentario,
      }),
    });

    const datos = await respuesta.json();

    if (datos.ok) {
      if (mensaje) {
        mensaje.textContent = datos.mensaje || "Reseña guardada correctamente.";
        mensaje.className = "mensaje-alerta exito";
      }

      if (campoComentario) campoComentario.value = "";
      seleccionarCalificacion(0);

      cargarResenas(productoId);
    } else {
      if (mensaje) {
        mensaje.textContent = datos.mensaje || "No se pudo guardar la reseña.";
        mensaje.className = "mensaje-alerta error";
      }
    }
  } catch (error) {
    console.error("Error al publicar la reseña:", error);
    if (mensaje) {
      mensaje.textContent = "Error al conectar con el servidor.";
      mensaje.className = "mensaje-alerta error";
    }
  }
}

//Mostrar reseñas de un producto
async function cargarResenas(productoId) {
  const lista = document.getElementById("lista-resenas");
  const resumen = document.getElementById("resumen-calificacion");

  if (!lista) return;

  try {
    const respuesta = await fetch(`/reseñas/${productoId}`);

    if (!respuesta.ok) {
      throw new Error(`Error HTTP: ${respuesta.status}`);
    }

    const datos = await respuesta.json();

    if (!datos.ok || !datos.reseñas || datos.reseñas.length === 0) {
      lista.innerHTML = `
        <div class="sin-resenas">
          <i class="fa-regular fa-comment-dots"></i>
          <p>Este producto todavía no tiene reseñas. ¡Sé el primero en calificarlo!</p>
        </div>
      `;

      if (resumen) {
        resumen.innerHTML = `
          <div class="score-badge empty">
            <span>⭐ Sin calificaciones</span>
            <small>Sé el primero en opinar</small>
          </div>
        `;
      }

      return;
    }

    let suma = 0;
    datos.reseñas.forEach((reseña) => {
      suma += reseña.calificacion;
    });

    const promedio = (suma / datos.reseñas.length).toFixed(1);
    const idUsuarioLogueado = localStorage.getItem("id_usuario");

    if (resumen) {
      const estrellasHeader =
        "★".repeat(Math.round(promedio)) + "☆".repeat(5 - Math.round(promedio));
      resumen.innerHTML = `
        <div class="score-badge">
          <div class="score-number">${promedio}</div>
          <div class="score-stars-col">
            <span class="stars-gold">${estrellasHeader}</span>
            <small>${datos.reseñas.length} ${datos.reseñas.length === 1 ? "reseña" : "reseñas"}</small>
          </div>
        </div>
      `;
    }

    lista.innerHTML = "";

    datos.reseñas.forEach((reseña) => {
      const div = document.createElement("div");
      div.classList.add("resena");

      const estrellasHtml =
        "★".repeat(reseña.calificacion) + "☆".repeat(5 - reseña.calificacion);

      const esMiResena =
        Number(idUsuarioLogueado) === Number(reseña.usuario_id);
      const botonEliminar = esMiResena
        ? `<button class="btn-eliminar-resena" onclick="eliminarResena(${reseña.id}, ${productoId})" title="Eliminar mi reseña">
             <i class="fa-solid fa-trash-can"></i> Eliminar
           </button>`
        : "";

      div.innerHTML = `
        <div class="resena-header">
          <div class="usuario-info">
            <div class="avatar-usuario">
              <i class="fa-solid fa-circle-user"></i>
            </div>
            <div>
              <h4>${reseña.usuario}</h4>
              <span class="fecha-resena">${new Date(reseña.fecha_creacion).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}</span>
            </div>
          </div>
          <div class="resena-estrellas-col">
            <div class="estrellas-resena">${estrellasHtml}</div>
            ${botonEliminar}
          </div>
        </div>
        <p class="comentario-texto">${reseña.comentario ? reseña.comentario : "<em>Sin comentario escrito.</em>"}</p>
      `;

      lista.appendChild(div);
    });
  } catch (error) {
    console.error("Error al cargar reseñas:", error);
    lista.innerHTML = `
      <div class="sin-resenas error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>No se pudieron cargar las reseñas en este momento.</p>
      </div>
    `;
  }
}

async function eliminarResena(idReseña, productoId) {
  if (!confirm("¿Estás seguro de que deseas eliminar tu reseña?")) {
    return;
  }

  try {
    const respuesta = await fetch(`/reseñas/${idReseña}`, {
      method: "DELETE",
    });

    const datos = await respuesta.json();

    if (datos.ok) {
      const mensaje = document.getElementById("mensaje-resena");
      if (mensaje) {
        mensaje.textContent = "Tu reseña ha sido eliminada.";
        mensaje.className = "mensaje-alerta exito";
      }
      cargarResenas(productoId);
    } else {
      alert(datos.mensaje || "No se pudo eliminar la reseña.");
    }
  } catch (error) {
    console.error("Error al eliminar la reseña:", error);
    alert("Error de conexión al intentar eliminar la reseña.");
  }
}

// Cerrar sesión del usuario
function cerrarSesion() {
  localStorage.removeItem("id_usuario");
  localStorage.removeItem("usuario");
  window.location.href = "inicio.html";
}
// Ir al detalle del producto
function verDetalleProducto(idProducto) {
  window.location.href = `detalleproducto.html?id=${idProducto}`;
}
//Lista de productos
if (document.getElementById("lista-productos")) {
  cargarProductos();
}

if (document.getElementById("lista-carrito")) {
  cargarCarrito();
}

if (document.getElementById("lista-favoritos")) {
  cargarFavoritos();
}

//Del perfil del usuario
if (window.location.pathname.includes("perfil.html")) {
  cargarPerfil();
}
//Captura búsqueda de productos
const campoBusqueda = document.getElementById("buscarProducto");

if (campoBusqueda) {
  campoBusqueda.addEventListener("input", buscarProducto);
}
// Cargar detalle automáticamente
if (document.getElementById("detalle-producto")) {
  cargarDetalleProducto();
}
const parametros = new URLSearchParams(window.location.search);
const productoIdResena = parametros.get("id");

if (productoIdResena && document.getElementById("lista-resenas")) {
  cargarResenas(productoIdResena);
}
