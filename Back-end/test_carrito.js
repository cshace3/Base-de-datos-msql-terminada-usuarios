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

function sendRequest(path, method, bodyData) {
    return new Promise((resolve, reject) => {
        const payload = bodyData ? JSON.stringify(bodyData) : "";
        const req = http.request({
            hostname: "localhost",
            port: 8080,
            path: path,
            method: method,
            headers: bodyData ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload)
            } : {}
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
        if (payload) req.write(payload);
        req.end();
    });
}

async function runCartTests() {
    console.log("==================================================");
    console.log("    INICIANDO PRUEBAS DE CARRITO DE COMPRAS       ");
    console.log("==================================================\n");

    const testUser = "test_cart_user_" + Date.now();
    const testEmail = "test_cart_" + Date.now() + "@example.com";
    const testPassword = "CartPassword123";

    let testUserId = null;
    let testProductId = null;
    let createdTempProduct = false;
    let detailId = null;

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
        // 1. Crear usuario de prueba en BD
        const userResult = await query(
            "INSERT INTO usuarios (usuario, correo, contraseña) VALUES (?, ?, ?)",
            [testUser, testEmail, testPassword]
        );
        testUserId = userResult.insertId;
        console.log(`Usuario de prueba creado -> ID: ${testUserId} (${testUser})`);

        // 2. Obtener o crear un producto de prueba en BD
        const existingProducts = await query("SELECT id FROM productos LIMIT 1");
        if (existingProducts.length > 0) {
            testProductId = existingProducts[0].id;
        } else {
            const prodResult = await query(
                "INSERT INTO productos (nombre, descripcion, precio, imagen) VALUES (?, ?, ?, ?)",
                ["Producto Prueba", "Descripción de prueba", 50000, "Logo1.png"]
            );
            testProductId = prodResult.insertId;
            createdTempProduct = true;
        }
        console.log(`Producto de prueba listo -> ID: ${testProductId}\n`);

        // Test 1: Validación - error al intentar agregar sin usuario_id o producto_id
        const resBadAdd = await sendRequest("/carrito/agregar", "POST", { usuario_id: testUserId });
        assert(
            "Rechazar agregar al carrito cuando faltan datos obligatorios (HTTP 400)",
            resBadAdd.statusCode === 400 && resBadAdd.body.ok === false,
            `Código: ${resBadAdd.statusCode}, Respuesta: ${JSON.stringify(resBadAdd.body)}`
        );

        // Test 2: Agregar producto al carrito por primera vez
        const resAdd1 = await sendRequest("/carrito/agregar", "POST", {
            usuario_id: testUserId,
            producto_id: testProductId,
            cantidad: 1
        });
        assert(
            "Agregar producto al carrito correctamente",
            resAdd1.statusCode === 200 && resAdd1.body.ok === true,
            `Respuesta: ${JSON.stringify(resAdd1.body)}`
        );

        // Test 3: Obtener carrito del usuario
        const resGetCart = await sendRequest(`/carrito/${testUserId}`, "GET");
        const cartItems = resGetCart.body.carrito || [];
        const addedItem = cartItems.find(item => item.producto_id === testProductId);
        if (addedItem) detailId = addedItem.id;

        assert(
            "Consultar productos en el carrito del usuario",
            resGetCart.body.ok === true && cartItems.length >= 1 && addedItem && addedItem.cantidad === 1,
            `Items obtenidos: ${JSON.stringify(resGetCart.body)}`
        );

        // Test 4: Incrementar cantidad agregando el mismo producto de nuevo
        const resAdd2 = await sendRequest("/carrito/agregar", "POST", {
            usuario_id: testUserId,
            producto_id: testProductId,
            cantidad: 2
        });
        const resGetCart2 = await sendRequest(`/carrito/${testUserId}`, "GET");
        const updatedItem = (resGetCart2.body.carrito || []).find(item => item.id === detailId);

        assert(
            "Sumar cantidad cuando el producto ya existe en el carrito",
            resAdd2.body.ok === true && updatedItem && updatedItem.cantidad === 3,
            `Cantidad actual: ${updatedItem ? updatedItem.cantidad : 'N/A'}`
        );

        // Test 5: Actualizar cantidad directamente mediante PUT /carrito/cantidad/:id
        const resPutQty = await sendRequest(`/carrito/cantidad/${detailId}`, "PUT", { cantidad: 5 });
        const resGetCart3 = await sendRequest(`/carrito/${testUserId}`, "GET");
        const putItem = (resGetCart3.body.carrito || []).find(item => item.id === detailId);

        assert(
            "Actualizar la cantidad de un ítem con PUT /carrito/cantidad/:id",
            resPutQty.body.ok === true && putItem && putItem.cantidad === 5,
            `Respuesta PUT: ${JSON.stringify(resPutQty.body)}, Cantidad: ${putItem ? putItem.cantidad : 'N/A'}`
        );

        // Test 6: Rechazar actualización con cantidad inválida (< 1)
        const resBadPut = await sendRequest(`/carrito/cantidad/${detailId}`, "PUT", { cantidad: 0 });
        assert(
            "Rechazar actualización de cantidad menor a 1 (HTTP 400)",
            resBadPut.statusCode === 400 && resBadPut.body.ok === false,
            `Código: ${resBadPut.statusCode}, Respuesta: ${JSON.stringify(resBadPut.body)}`
        );

        // Test 7: Eliminar producto del carrito mediante DELETE /carrito/producto/:id
        const resDelete = await sendRequest(`/carrito/producto/${detailId}`, "DELETE");
        const resGetCart4 = await sendRequest(`/carrito/${testUserId}`, "GET");
        const deletedItem = (resGetCart4.body.carrito || []).find(item => item.id === detailId);

        assert(
            "Eliminar producto del carrito con DELETE /carrito/producto/:id",
            resDelete.body.ok === true && !deletedItem,
            `Respuesta DELETE: ${JSON.stringify(resDelete.body)}, Items restantes: ${resGetCart4.body.carrito ? resGetCart4.body.carrito.length : 0}`
        );

    } catch (err) {
        console.error("Error inesperado durante las pruebas:", err);
    } finally {
        // Limpieza de datos de prueba en la BD
        if (testUserId) {
            await query("DELETE FROM detalle_carrito WHERE carrito_id IN (SELECT id FROM carrito WHERE usuario_id = ?)", [testUserId]);
            await query("DELETE FROM carrito WHERE usuario_id = ?", [testUserId]);
            await query("DELETE FROM usuarios WHERE id = ?", [testUserId]);
            console.log(`\nLimpieza: Usuario de prueba y su carrito eliminados de la BD.`);
        }
        if (createdTempProduct && testProductId) {
            await query("DELETE FROM productos WHERE id = ?", [testProductId]);
            console.log(`Limpieza: Producto temporal de prueba eliminado de la BD.`);
        }

        conn.end();

        console.log("\n==================================================");
        console.log(`  RESUMEN DE PRUEBAS: ${passedTests}/${totalTests} PASADAS  `);
        console.log("==================================================");
        process.exit(passedTests === totalTests ? 0 : 1);
    }
}

runCartTests();
