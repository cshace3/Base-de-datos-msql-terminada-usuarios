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

// Simulador de funciones del Frontend (script.js)
function simularCambiarCantidad(cantidadActual, cambio, stockDisponible) {
    let nuevaCantidad = cantidadActual + cambio;
    if (nuevaCantidad < 1) nuevaCantidad = 1;
    if (nuevaCantidad > stockDisponible) nuevaCantidad = stockDisponible;
    return nuevaCantidad;
}

async function runDetalleProductoTests() {
    console.log("==================================================");
    console.log("  INICIANDO PRUEBAS DE DETALLE DE PRODUCTO (GET /productos/:id)");
    console.log("==================================================\n");

    let testProductId = null;
    let createdTempProduct = false;
    let testUserId = null;

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
        // 1. Obtener o crear un producto de prueba en BD
        const existingProducts = await query("SELECT * FROM productos LIMIT 1");
        if (existingProducts.length > 0) {
            testProductId = existingProducts[0].id;
        } else {
            const prodResult = await query(
                "INSERT INTO productos (nombre, descripcion, precio, imagen, stock) VALUES (?, ?, ?, ?, ?)",
                ["Chaqueta Test Detalle", "Descripción detallada de prueba", 120000, "Banner.png", 10]
            );
            testProductId = prodResult.insertId;
            createdTempProduct = true;
        }
        console.log(`Producto de prueba listo -> ID: ${testProductId}\n`);

        // Test 1: Consultar producto existente por ID (HTTP 200)
        const resDetail = await sendRequest(`/productos/${testProductId}`, "GET");
        assert(
            "Obtener detalle de producto existente (HTTP 200 y ok: true)",
            resDetail.statusCode === 200 && resDetail.body.ok === true && resDetail.body.producto !== undefined,
            `Código: ${resDetail.statusCode}, Respuesta: ${JSON.stringify(resDetail.body)}`
        );

        // Test 2: Validar estructura del objeto producto devuelto
        const prod = resDetail.body.producto || {};
        assert(
            "Verificar estructura y campos obligatorios del producto (id, nombre, descripcion, precio, imagen)",
            prod.id === testProductId &&
            typeof prod.nombre === "string" &&
            typeof prod.descripcion === "string" &&
            prod.precio !== undefined &&
            prod.imagen !== undefined,
            `Campos obtenidos: ${JSON.stringify(prod)}`
        );

        // Test 3: Consultar ID de producto inexistente (HTTP 404)
        const resNotFound = await sendRequest("/productos/999999", "GET");
        assert(
            "Retornar error HTTP 404 para un producto que no existe en la BD",
            resNotFound.statusCode === 404 && resNotFound.body.ok === false && resNotFound.body.mensaje === "Producto no encontrado",
            `Código: ${resNotFound.statusCode}, Respuesta: ${JSON.stringify(resNotFound.body)}`
        );

        // Test 4: Consultar ID no numérico / inválido
        const resInvalidId = await sendRequest("/productos/invalid_id_test", "GET");
        assert(
            "Manejar correctamente ID de producto no numérico (HTTP 404)",
            resInvalidId.statusCode === 404 && resInvalidId.body.ok === false,
            `Código: ${resInvalidId.statusCode}, Respuesta: ${JSON.stringify(resInvalidId.body)}`
        );

        // Test 5: Simulador de Frontend - Control de cantidad (límite inferior 1)
        const stockPrueba = prod.stock !== undefined ? prod.stock : 5;
        const qtyInferior = simularCambiarCantidad(1, -1, stockPrueba);
        assert(
            "Simulación Frontend: La cantidad seleccionada no debe bajar de 1",
            qtyInferior === 1,
            `Cantidad calculada: ${qtyInferior}`
        );

        // Test 6: Simulador de Frontend - Control de cantidad (límite superior por Stock)
        const qtySuperior = simularCambiarCantidad(stockPrueba, +5, stockPrueba);
        assert(
            "Simulación Frontend: La cantidad seleccionada no debe superar el stock disponible",
            qtySuperior === stockPrueba,
            `Stock: ${stockPrueba}, Cantidad calculada: ${qtySuperior}`
        );

        // Test 7: Agregar al carrito desde el detalle con cantidad seleccionada
        const userResult = await query(
            "INSERT INTO usuarios (usuario, correo, contraseña) VALUES (?, ?, ?)",
            [`test_detalle_user_${Date.now()}`, `test_detalle_${Date.now()}@example.com`, "Pass123!"]
        );
        testUserId = userResult.insertId;

        const resAddToCart = await sendRequest("/carrito/agregar", "POST", {
            usuario_id: testUserId,
            producto_id: testProductId,
            cantidad: 2
        });

        assert(
            "Agregar al carrito desde la vista de detalle con cantidad específica (2 unidades)",
            resAddToCart.statusCode === 200 && resAddToCart.body.ok === true,
            `Respuesta: ${JSON.stringify(resAddToCart.body)}`
        );

    } catch (err) {
        console.error("Error inesperado durante las pruebas de detalle de producto:", err);
    } finally {
        // Limpieza de datos de prueba
        if (testUserId) {
            await query("DELETE FROM detalle_carrito WHERE carrito_id IN (SELECT id FROM carrito WHERE usuario_id = ?)", [testUserId]);
            await query("DELETE FROM carrito WHERE usuario_id = ?", [testUserId]);
            await query("DELETE FROM usuarios WHERE id = ?", [testUserId]);
            console.log(`\nLimpieza: Usuario de prueba eliminado de la BD.`);
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

runDetalleProductoTests();
