const mysql = require("mysql2");
const http = require("http");

const DB_CONFIG = {
    host: "localhost",
    user: "root",
    password: "",
    database: "polaris"
};

const conn = mysql.createConnection(DB_CONFIG);

function query(sql, params) {
    return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

function sendRequest(path, method, bodyData = null, customHeaders = {}) {
    return new Promise((resolve, reject) => {
        const headers = { ...customHeaders };
        let payload = null;
        if (bodyData !== null) {
            payload = JSON.stringify(bodyData);
            headers["Content-Type"] = "application/json";
            headers["Content-Length"] = Buffer.byteLength(payload);
        }
        const req = http.request({
            hostname: "localhost",
            port: 8080,
            path: path,
            method: method,
            headers: headers
        }, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });

        req.on("error", (err) => reject(err));
        if (payload !== null) req.write(payload);
        req.end();
    });
}

async function runAdminTests() {
    console.log("==================================================");
    console.log("    INICIANDO PRUEBAS DEL MÓDULO ADMINISTRADOR    ");
    console.log("==================================================\n");

    const timestamp = Date.now();
    const adminUser = "test_admin_user_" + timestamp;
    const adminEmail = "test_admin_" + timestamp + "@example.com";
    const clientUser = "test_client_user_" + timestamp;
    const clientEmail = "test_client_" + timestamp + "@example.com";
    const testPassword = "AdminPass123";

    let adminUserId = null;
    let clientUserId = null;
    let createdProductId = null;

    let passedTests = 0;
    let totalTests = 0;

    function assert(description, condition, details = "") {
        totalTests++;
        if (condition) {
            console.log(`[PASS] Prueba ${totalTests}: ${description}`);
            passedTests++;
        } else {
            console.error(`[FAIL] Prueba ${totalTests}: ${description}`);
            if (details) console.error(`       Detalles: ${details}`);
        }
    }

    try {
        // 1. Crear usuarios de prueba en la BD
        const resAdminDb = await query(
            "INSERT INTO usuarios (usuario, correo, contraseña, rol) VALUES (?, ?, ?, 'admin')",
            [adminUser, adminEmail, testPassword]
        );
        adminUserId = resAdminDb.insertId;
        console.log(`Usuario Admin de prueba creado -> ID: ${adminUserId} (${adminUser})`);

        const resClientDb = await query(
            "INSERT INTO usuarios (usuario, correo, contraseña, rol) VALUES (?, ?, ?, 'cliente')",
            [clientUser, clientEmail, testPassword]
        );
        clientUserId = resClientDb.insertId;
        console.log(`Usuario Cliente de prueba creado -> ID: ${clientUserId} (${clientUser})\n`);

        // Test 1: Seguridad - Acceso sin encabezado usuario-id (HTTP 401)
        const resNoAuth = await sendRequest("/admin/usuarios", "GET");
        assert(
            "Rechazar acceso si falta el encabezado 'usuario-id' (HTTP 401)",
            resNoAuth.statusCode === 401 && resNoAuth.body.ok === false && resNoAuth.body.mensaje === "No has iniciado sesión",
            `Código: ${resNoAuth.statusCode}, Respuesta: ${JSON.stringify(resNoAuth.body)}`
        );

        // Test 2: Seguridad - Acceso con ID de usuario inexistente (HTTP 401)
        const resNotFoundUser = await sendRequest("/admin/usuarios", "GET", null, { "usuario-id": "999999" });
        assert(
            "Rechazar acceso si el ID de usuario no existe (HTTP 401)",
            resNotFoundUser.statusCode === 401 && resNotFoundUser.body.ok === false && resNotFoundUser.body.mensaje === "Usuario no encontrado",
            `Código: ${resNotFoundUser.statusCode}, Respuesta: ${JSON.stringify(resNotFoundUser.body)}`
        );

        // Test 3: Seguridad - Acceso con usuario cliente sin rol admin (HTTP 403)
        const resForbidden = await sendRequest("/admin/usuarios", "GET", null, { "usuario-id": String(clientUserId) });
        assert(
            "Rechazar acceso a usuarios sin rol de administrador (HTTP 403)",
            resForbidden.statusCode === 403 && resForbidden.body.ok === false && resForbidden.body.mensaje === "No tienes permisos de administrador",
            `Código: ${resForbidden.statusCode}, Respuesta: ${JSON.stringify(resForbidden.body)}`
        );

        // Test 4: Consultar usuarios registrados (GET /admin/usuarios)
        const resUsuarios = await sendRequest("/admin/usuarios", "GET", null, { "usuario-id": String(adminUserId) });
        assert(
            "Obtener lista de usuarios como Administrador (HTTP 200)",
            resUsuarios.statusCode === 200 && resUsuarios.body.ok === true && Array.isArray(resUsuarios.body.usuarios),
            `Código: ${resUsuarios.statusCode}, Respuesta: ${JSON.stringify(resUsuarios.body)}`
        );

        // Test 5: Consultar lista de productos (GET /admin/productos)
        const resProductos = await sendRequest("/admin/productos", "GET", null, { "usuario-id": String(adminUserId) });
        assert(
            "Obtener lista de productos como Administrador (HTTP 200)",
            resProductos.statusCode === 200 && resProductos.body.ok === true && Array.isArray(resProductos.body.productos),
            `Código: ${resProductos.statusCode}, Respuesta: ${JSON.stringify(resProductos.body)}`
        );

        // Test 6: Agregar un producto nuevo (POST /admin/productos)
        const nuevoProducto = {
            nombre: "Producto Admin Test " + timestamp,
            descripcion: "Descripción de prueba para panel admin",
            precio: 120000,
            imagen: "test_banner.png",
            stock: 15
        };
        const resAgregar = await sendRequest("/admin/productos", "POST", nuevoProducto, { "usuario-id": String(adminUserId) });
        assert(
            "Agregar un nuevo producto desde el panel de administración",
            resAgregar.statusCode === 200 && resAgregar.body.ok === true && typeof resAgregar.body.id === "number",
            `Código: ${resAgregar.statusCode}, Respuesta: ${JSON.stringify(resAgregar.body)}`
        );

        if (resAgregar.body && resAgregar.body.id) {
            createdProductId = resAgregar.body.id;

            // Test 7: Editar el producto recién creado (PUT /admin/productos/:id)
            const productoEditado = {
                nombre: "Producto Admin Modificado " + timestamp,
                descripcion: "Descripción actualizada por test",
                precio: 145000,
                imagen: "test_banner_updated.png",
                stock: 40
            };
            const resEditar = await sendRequest(`/admin/productos/${createdProductId}`, "PUT", productoEditado, { "usuario-id": String(adminUserId) });
            assert(
                "Editar información de un producto existente (HTTP 200)",
                resEditar.statusCode === 200 && resEditar.body.ok === true && resEditar.body.mensaje === "Producto actualizado correctamente",
                `Código: ${resEditar.statusCode}, Respuesta: ${JSON.stringify(resEditar.body)}`
            );

            // Test 8: Consultar control de stock (GET /admin/stock)
            const resStock = await sendRequest("/admin/stock", "GET", null, { "usuario-id": String(adminUserId) });
            const productoEnStock = resStock.body.productos ? resStock.body.productos.find(p => p.id === createdProductId) : null;
            assert(
                "Consultar control de stock y verificar la cantidad actualizada (stock: 40)",
                resStock.statusCode === 200 && resStock.body.ok === true && productoEnStock && productoEnStock.stock === 40,
                `Respuesta stock: ${JSON.stringify(resStock.body)}`
            );

            // Test 9: Eliminar el producto creado (DELETE /admin/productos/:id)
            const resEliminar = await sendRequest(`/admin/productos/${createdProductId}`, "DELETE", null, { "usuario-id": String(adminUserId) });
            assert(
                "Eliminar producto desde el panel de administración",
                resEliminar.statusCode === 200 && resEliminar.body.ok === true && resEliminar.body.mensaje === "Producto eliminado correctamente",
                `Código: ${resEliminar.statusCode}, Respuesta: ${JSON.stringify(resEliminar.body)}`
            );

            // Test 10: Intentar eliminar producto que ya no existe (HTTP 404)
            const resEliminarRepetido = await sendRequest(`/admin/productos/${createdProductId}`, "DELETE", null, { "usuario-id": String(adminUserId) });
            assert(
                "Retornar HTTP 404 al intentar eliminar un producto inexistente",
                resEliminarRepetido.statusCode === 404 && resEliminarRepetido.body.ok === false && resEliminarRepetido.body.mensaje === "Producto no encontrado",
                `Código: ${resEliminarRepetido.statusCode}, Respuesta: ${JSON.stringify(resEliminarRepetido.body)}`
            );
        }

        // Test 11: Intentar editar producto con ID inexistente (HTTP 404)
        const resEditInexistente = await sendRequest("/admin/productos/999999", "PUT", {
            nombre: "Fantasma",
            descripcion: "Desc",
            precio: 100,
            imagen: "img.jpg",
            stock: 1
        }, { "usuario-id": String(adminUserId) });
        assert(
            "Retornar HTTP 404 al intentar editar un producto inexistente",
            resEditInexistente.statusCode === 404 && resEditInexistente.body.ok === false && resEditInexistente.body.mensaje === "Producto no encontrado",
            `Código: ${resEditInexistente.statusCode}, Respuesta: ${JSON.stringify(resEditInexistente.body)}`
        );

    } catch (err) {
        console.error("Error inesperado durante la ejecución de las pruebas:", err);
    } finally {
        // Limpieza de datos en BD
        if (createdProductId) {
            await query("DELETE FROM productos WHERE id = ?", [createdProductId]);
        }
        if (adminUserId) {
            await query("DELETE FROM usuarios WHERE id = ?", [adminUserId]);
        }
        if (clientUserId) {
            await query("DELETE FROM usuarios WHERE id = ?", [clientUserId]);
        }
        console.log("\nLimpieza: Usuarios y productos de prueba eliminados de la BD.");

        conn.end();

        console.log("\n==================================================");
        console.log(`  RESUMEN DE PRUEBAS: ${passedTests}/${totalTests} PASADAS  `);
        console.log("==================================================");
        process.exit(passedTests === totalTests ? 0 : 1);
    }
}

runAdminTests();
