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
            path: encodeURI(path),
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

// Simulación de lógica Frontend para promedios y botones de estrellas
function simularCalculoPromedio(reseñas) {
    if (!reseñas || reseñas.length === 0) return 0;
    const suma = reseñas.reduce((acc, r) => acc + r.calificacion, 0);
    return Number((suma / reseñas.length).toFixed(1));
}

function simularEstrellasHtml(calificacion) {
    return "★".repeat(calificacion) + "☆".repeat(5 - calificacion);
}

async function runResenasTests() {
    console.log("==================================================");
    console.log("    INICIANDO PRUEBAS DEL MÓDULO DE RESEÑAS      ");
    console.log("==================================================\n");

    let totalTests = 0;
    let passedTests = 0;

    function assert(description, condition, details = "") {
        totalTests++;
        if (condition) {
            console.log(`[PASS] Prueba ${totalTests}: ${description}`);
            passedTests++;
        } else {
            console.error(`[FAIL] Prueba ${totalTests}: ${description}`);
            if (details) console.error(`       Detalles: ${JSON.stringify(details)}`);
        }
    }

    let testProductId = null;
    let createdProduct = false;
    let testUserId1 = null;
    let testUserId2 = null;
    let reviewId1 = null;
    let reviewId2 = null;

    try {
        // 1. Setup: Crear o reutilizar un producto de prueba
        const prods = await query("SELECT id FROM productos LIMIT 1");
        if (prods.length > 0) {
            testProductId = prods[0].id;
        } else {
            const pRes = await query(
                "INSERT INTO productos (nombre, descripcion, precio, imagen, stock) VALUES (?, ?, ?, ?, ?)",
                ["Producto Prueba Reseñas", "Descripción de prueba", 50000, "Banner.png", 10]
            );
            testProductId = pRes.insertId;
            createdProduct = true;
        }

        // 2. Setup: Crear 2 usuarios de prueba
        const uRes1 = await query(
            "INSERT INTO usuarios (usuario, correo, contraseña) VALUES (?, ?, ?)",
            ["user_test_resena_1_" + Date.now(), "resena1_" + Date.now() + "@test.com", "pass123"]
        );
        testUserId1 = uRes1.insertId;

        const uRes2 = await query(
            "INSERT INTO usuarios (usuario, correo, contraseña) VALUES (?, ?, ?)",
            ["user_test_resena_2_" + Date.now(), "resena2_" + Date.now() + "@test.com", "pass123"]
        );
        testUserId2 = uRes2.insertId;

        console.log(`Setup listo -> Producto ID: ${testProductId}, Usuario1 ID: ${testUserId1}, Usuario2 ID: ${testUserId2}\n`);

        // Prueba 1: GET /reseñas/:producto_id inicialmente
        const getRes1 = await sendRequest(`/reseñas/${testProductId}`, "GET");
        assert(
            "Obtener reseñas de un producto (HTTP 200 y status ok)",
            getRes1.statusCode === 200 && getRes1.body.ok === true,
            getRes1
        );

        // Prueba 2: Rechazar publicación si faltan datos o calificación es inválida (<1 o >5)
        const invalidRes = await sendRequest("/reseñas/agregar", "POST", {
            usuario_id: testUserId1,
            producto_id: testProductId,
            calificacion: 6,
            comentario: "Excelente!"
        });
        assert(
            "Rechazar publicación con calificación fuera de rango (HTTP 400)",
            invalidRes.statusCode === 400 && invalidRes.body.ok === false,
            invalidRes
        );

        // Prueba 3: Publicar reseña válida con Usuario 1 (5 estrellas)
        const addRes1 = await sendRequest("/reseñas/agregar", "POST", {
            usuario_id: testUserId1,
            producto_id: testProductId,
            calificacion: 5,
            comentario: "¡Increíble calidad y envío rápido!"
        });
        assert(
            "Publicar reseña exitosa para el Usuario 1 (5 estrellas)",
            addRes1.statusCode === 200 && addRes1.body.ok === true,
            addRes1
        );

        // Prueba 4: Evitar duplicado si el Usuario 1 intenta calificar nuevamente el mismo producto
        const dupRes = await sendRequest("/reseñas/agregar", "POST", {
            usuario_id: testUserId1,
            producto_id: testProductId,
            calificacion: 4,
            comentario: "Intento duplicado"
        });
        assert(
            "Evitar reseña duplicada para el mismo usuario y producto",
            dupRes.body.ok === false && dupRes.body.mensaje.includes("Ya has calificado")
        );

        // Prueba 5: Publicar reseña válida con Usuario 2 (3 estrellas)
        const addRes2 = await sendRequest("/reseñas/agregar", "POST", {
            usuario_id: testUserId2,
            producto_id: testProductId,
            calificacion: 3,
            comentario: "Está bien, pero la tela podría ser mejor."
        });
        assert(
            "Publicar reseña exitosa para el Usuario 2 (3 estrellas)",
            addRes2.statusCode === 200 && addRes2.body.ok === true
        );

        // Prueba 6: Verificar obtención de reseñas y cálculo del promedio ( (5 + 3) / 2 = 4.0 )
        const getRes2 = await sendRequest(`/reseñas/${testProductId}`, "GET");
        const listaResenas = getRes2.body.reseñas || [];
        const promedio = simularCalculoPromedio(listaResenas);
        
        // Guardar IDs de reseñas para la prueba de eliminación
        const rUser1 = listaResenas.find(r => r.usuario_id === testUserId1);
        const rUser2 = listaResenas.find(r => r.usuario_id === testUserId2);
        if (rUser1) reviewId1 = rUser1.id;
        if (rUser2) reviewId2 = rUser2.id;

        assert(
            "Calcular correctamente el promedio de estrellas (Esperado: 4.0)",
            promedio === 4.0 && listaResenas.length >= 2
        );

        // Prueba 7: Simular renderizado de estrellas en Frontend (5 estrellas -> '★★★★★', 3 estrellas -> '★★★☆☆')
        const renderingU1 = simularEstrellasHtml(5);
        const renderingU2 = simularEstrellasHtml(3);
        assert(
            "Generar representación de estrellas visuales en Frontend ('★★★★★' y '★★★☆☆')",
            renderingU1 === "★★★★★" && renderingU2 === "★★★☆☆"
        );

        // Prueba 8: Eliminar una reseña (DELETE /reseñas/:id)
        if (reviewId2) {
            const delRes = await sendRequest(`/reseñas/${reviewId2}`, "DELETE");
            assert(
                "Eliminar reseña correctamente mediante DELETE /reseñas/:id",
                delRes.statusCode === 200 && delRes.body.ok === true
            );
        } else {
            assert("Eliminar reseña correctamente mediante DELETE /reseñas/:id", false, "No se encontró ID de reseña 2");
        }

    } catch (err) {
        console.error("Error catastrófico en la ejecución de pruebas:", err);
    } finally {
        // Limpieza de BD
        if (testUserId1) {
            await query("DELETE FROM reseñas WHERE usuario_id = ?", [testUserId1]);
            await query("DELETE FROM usuarios WHERE id = ?", [testUserId1]);
        }
        if (testUserId2) {
            await query("DELETE FROM reseñas WHERE usuario_id = ?", [testUserId2]);
            await query("DELETE FROM usuarios WHERE id = ?", [testUserId2]);
        }
        if (createdProduct && testProductId) {
            await query("DELETE FROM productos WHERE id = ?", [testProductId]);
        }
        conn.end();

        console.log("\n==================================================");
        console.log(`  RESUMEN DE PRUEBAS: ${passedTests}/${totalTests} PASADAS`);
        console.log("==================================================\n");
    }
}

runResenasTests();
