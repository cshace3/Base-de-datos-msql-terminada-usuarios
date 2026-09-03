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
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                usuario,
                correo,
                contraseña
            })
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
        document.getElementById("mensaje").textContent = "Error al conectar con el servidor";
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
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                usuario,
                correo,
                contraseña
            })
        });

        const datos = await respuesta.json();
        if (datos.ok) {

            console.log("DATOS DEL LOGIN:", datos);

            localStorage.setItem("id_usuario", datos.id_usuario);
            localStorage.setItem("usuario", datos.usuario);

            document.getElementById("mensaje").textContent = "Inicio de sesión exitoso";
            document.getElementById("mensaje").style.color = "green";

            setTimeout(() => {
                window.location.href = "Productos.html";
            }, 2000);

        }
        else {
            document.getElementById("mensaje").textContent = "Correo o contraseña incorrectos";
            document.getElementById("mensaje").style.color = "red";
        }
    } catch (err) {
        document.getElementById("mensaje").textContent = "Error al conectar con el servidor";
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
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                usuario,
                correo,
                actual,
                nueva
            })
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

        productos.forEach(producto => {

            const div = document.createElement("div");
            div.classList.add("contenedor");

            div.innerHTML = `
                <img class="imagen-1" src="/img/${producto.imagen}">

                <h2>${producto.nombre}</h2>

                <p>${producto.descripcion}</p>

                <p>$${Number(producto.precio).toLocaleString("es-CO")}</p>

              <button onclick="agregarCarrito(${producto.id}, event)">
                  Agregar al carrito
              </button>

                <p class="mensaje"></p>
            `;

            contenedor.appendChild(div);

        });

    } catch (error) {

        console.error("Error al cargar los productos:", error);

    }

}
//Buscar productos
function buscarProducto() {

    const texto = document
        .getElementById("buscarProducto")
        .value
        .trim()
        .toLowerCase();

    const contenedor = document.getElementById("lista-productos");

    if (texto === "") {
        cargarProductos();
        return;
    }

    const resultados = productosDisponibles.filter(producto =>
        producto.nombre.toLowerCase().includes(texto) ||
        (producto.descripcion && producto.descripcion.toLowerCase().includes(texto))
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

    resultados.forEach(producto => {

        const div = document.createElement("div");

        div.classList.add("contenedor");

        div.innerHTML = `
            <img class="imagen-1" src="/img/${producto.imagen}">

            <h2>${producto.nombre}</h2>

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
    const mensaje = contenedorProducto ? contenedorProducto.querySelector(".mensaje") : null;

    try {

        const respuesta = await fetch("/carrito/agregar", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                usuario_id: idUsuario,
                producto_id: idProducto,
                cantidad: 1
            })
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

        datos.carrito.forEach(producto => {

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

        const respuesta = await fetch(`/carrito/${localStorage.getItem("id_usuario")}`);

        const datos = await respuesta.json();

        const producto = datos.carrito.find(
            p => p.id === idDetalle
        );

        if (!producto) return;

        await fetch(`/carrito/cantidad/${idDetalle}`, {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                cantidad: producto.cantidad + 1
            })
        });

        cargarCarrito();

    } catch (error) {

        console.error("Error al aumentar cantidad:", error);

    }
}
//Disminuir cantidad de productos
async function disminuirCantidad(idDetalle) {

    try {

        const respuesta = await fetch(`/carrito/${localStorage.getItem("id_usuario")}`);

        const datos = await respuesta.json();

        const producto = datos.carrito.find(
            p => p.id === idDetalle
        );

        if (!producto) return;

        if (producto.cantidad <= 1) {
            eliminarProducto(idDetalle);
            return;
        }

        await fetch(`/carrito/cantidad/${idDetalle}`, {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                cantidad: producto.cantidad - 1
            })
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
            method: "DELETE"
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

if (document.getElementById("lista-productos")) {
    cargarProductos();
}

if (document.getElementById("lista-carrito")) {
    cargarCarrito();
}
//Captura búsqueda de productos
const campoBusqueda = document.getElementById("buscarProducto");

if (campoBusqueda) {
    campoBusqueda.addEventListener("input", buscarProducto);
}



