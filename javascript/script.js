//Funcion Registrar
async function registrar() {
    let usuario = document.getElementById("usuario").value;
    let fecha = document.getElementById("fecha").value;
    let correo = document.getElementById("correo").value;
    let contraseña = document.getElementById("contraseña").value;
let mensaje = document.getElementById("mensaje");

    //Validar campos
    if (usuario === "" || fecha === "" || correo === "" || contraseña === "") {
        event.preventDefault();
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

    

}



//Inicio sesion
async function iniciar() {
    let usuario = document.getElementById("usuario").value;
    let correo = document.getElementById("correo").value;
    let contraseña = document.getElementById("contraseña").value;

    let mensaje = document.getElementById("mensaje");
    //Limpiar mensaje
    mensaje.textContent = "";

    //Validar campos
    if (usuario === "" ||correo === "" || contraseña === "") {

        event.preventDefault();
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
    //Guardado local de registro
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




//Actualizar datos
function Actualizado() {
    let correo = document.getElementById("correo").value;
    let contraseña = document.getElementById("contraseña").value;


}

//Agregar al carrito
function agregarCarrito() {
    alert("Producto agregado al carrito");
}






}

