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
            document.getElementById("mensaje").textContent = "Inicio de sesión exitoso";
            document.getElementById("mensaje").style.color = "green";

            setTimeout(() => {
                window.location.href = "Productos.html";
            }, 2000);
        } else {
            document.getElementById("mensaje").textContent = "Correo o contraseña incorrectos";
            document.getElementById("mensaje").style.color = "red";
        }
    } catch (err) {
        document.getElementById("mensaje").textContent = "Error al conectar con el servidor";
        document.getElementById("mensaje").style.color = "red";
    }
}

//Actualizar datos
document.getElementById("foActualizar").addEventListener("submit", async (e) => {

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

    const respuesta = await fetch("http://localhost:8080/actualizar-password", {
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

//Agregar al carrito



