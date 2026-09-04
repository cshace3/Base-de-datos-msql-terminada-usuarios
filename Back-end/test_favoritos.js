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

async function runFavoritosTests() {
    console.log("==================================================");
    console.log("    INICIANDO PRUEBAS DEL MÓDULO DE FAVORITOS     ");
    console.log("==================================================\n");

    const testUser = "test_fav_user_" + Date.now();
    const testEmail = "test_fav_" + Date.now() + "@example.com";
    const testPassword = "FavPassword123";

    let testUserId = null;
    let testProductId = null;
    let createdTempProduct = false;

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
                ["Producto Favorito Prueba", "Descripción de prueba", 75000, "Logo1.png"]
            );
            testProductId = prodResult.insertId;
            createdTempProduct = true;
        }
        console.log(`Producto de prueba listo -> ID: ${testProductId}\n`);

        // Test 1: Validación - Rechazar agregar a favoritos sin usuario_id o producto_id (HTTP 400)
        const resBadAdd = await sendRequest("/favoritos/agregar", "POST", { usuario_id: testUserId });
        assert(
            "Rechazar agregar a favoritos cuando faltan datos obligatorios (HTTP 400)",
            resBadAdd.statusCode === 400 && resBadAdd.body.ok === false,
            `Código: ${resBadAdd.statusCode}, Respuesta: ${JSON.stringify(resBadAdd.body)}`
        );

        // Test 2: Agregar producto a favoritos exitosamente (POST /favoritos/agregar)
        const resAdd = await sendRequest("/favoritos/agregar", "POST", {
            usuario_id: testUserId,
            producto_id: testProductId
        });
        assert(
            "Agregar producto a favoritos correctamente",
            resAdd.statusCode === 200 && resAdd.body.ok === true && resAdd.body.mensaje === "Producto agregado a favoritos",
            `Respuesta: ${JSON.stringify(resAdd.body)}`
        );

        // Test 3: Evitar duplicados al intentar agregar el mismo producto a favoritos
        const resAddDup = await sendRequest("/favoritos/agregar", "POST", {
            usuario_id: testUserId,
            producto_id: testProductId
        });
        assert(
            "Rechazar agregar duplicado a favoritos (mensaje de duplicado)",
            resAddDup.body.ok === false && resAddDup.body.mensaje === "El producto ya está en favoritos",
            `Respuesta: ${JSON.stringify(resAddDup.body)}`
        );

        // Test 4: Consultar lista de favoritos del usuario (GET /favoritos/:usuario_id)
        const resGetFavs = await sendRequest(`/favoritos/${testUserId}`, "GET");
        const favoritosList = resGetFavs.body.favoritos || [];
        const isItemPresent = favoritosList.some(item => item.producto_id === testProductId);
        assert(
            "Obtener lista de favoritos del usuario",
            resGetFavs.statusCode === 200 && resGetFavs.body.ok === true && isItemPresent,
            `Favoritos devueltos: ${JSON.stringify(resGetFavs.body)}`
        );

        // Test 5: Eliminar producto de favoritos (DELETE /favoritos/:usuario_id/:producto_id)
        const resDelete = await sendRequest(`/favoritos/${testUserId}/${testProductId}`, "DELETE");
        assert(
            "Eliminar producto de favoritos con DELETE /favoritos/:usuario_id/:producto_id",
            resDelete.statusCode === 200 && resDelete.body.ok === true && resDelete.body.mensaje === "Producto eliminado de favoritos",
            `Respuesta DELETE: ${JSON.stringify(resDelete.body)}`
        );

        // Test 6: Verificar que la lista de favoritos queda vacía tras eliminar
        const resGetFavs2 = await sendRequest(`/favoritos/${testUserId}`, "GET");
        const remainingFavs = resGetFavs2.body.favoritos || [];
        const isStillPresent = remainingFavs.some(item => item.producto_id === testProductId);
        assert(
            "Verificar que el producto eliminado ya no aparece en favoritos",
            resGetFavs2.body.ok === true && !isStillPresent,
            `Favoritos devueltos tras eliminar: ${JSON.stringify(resGetFavs2.body)}`
        );

    } catch (err) {
        console.error("Error inesperado durante las pruebas de favoritos:", err);
    } finally {
        // Limpieza de datos de prueba en la BD
        if (testUserId) {
            await query("DELETE FROM favoritos WHERE usuario_id = ?", [testUserId]);
            await query("DELETE FROM usuarios WHERE id = ?", [testUserId]);
            console.log(`\nLimpieza: Usuario de prueba y sus favoritos fueron eliminados de la BD.`);
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

runFavoritosTests();
