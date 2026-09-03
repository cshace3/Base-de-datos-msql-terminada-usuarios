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

function sendRequest(path, method) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: "localhost",
            port: 8080,
            path: path,
            method: method
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
        req.end();
    });
}

async function runPerfilTests() {
    console.log("==================================================");
    console.log("     INICIANDO PRUEBAS DEL MÓDULO DE PERFIL       ");
    console.log("==================================================\n");

    const testUser = "test_perfil_user_" + Date.now();
    const testEmail = "test_perfil_" + Date.now() + "@example.com";
    const testPassword = "PerfilPassword123";

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
        // 1. Crear usuario de prueba en BD
        const userResult = await query(
            "INSERT INTO usuarios (usuario, correo, contraseña) VALUES (?, ?, ?)",
            [testUser, testEmail, testPassword]
        );
        testUserId = userResult.insertId;
        console.log(`Usuario de prueba creado -> ID: ${testUserId} (${testUser})\n`);

        // Test 1: Consultar perfil existente por ID (GET /perfil/:id)
        const resPerfil = await sendRequest(`/perfil/${testUserId}`, "GET");
        assert(
            "Obtener datos del perfil para usuario existente (HTTP 200)",
            resPerfil.statusCode === 200 && resPerfil.body.ok === true,
            `Código: ${resPerfil.statusCode}, Respuesta: ${JSON.stringify(resPerfil.body)}`
        );

        // Test 2: Validar coincidencia de datos devueltos (id_usuario, usuario, correo)
        assert(
            "Verificar que id_usuario, usuario y correo coinciden con la BD",
            resPerfil.body.id_usuario === testUserId &&
            resPerfil.body.usuario === testUser &&
            resPerfil.body.correo === testEmail,
            `Esperado: { id: ${testUserId}, usuario: "${testUser}", correo: "${testEmail}" }, Obtenido: ${JSON.stringify(resPerfil.body)}`
        );

        // Test 3: Seguridad - asegurar que no se expone la contraseña en la respuesta del perfil
        assert(
            "Garantizar seguridad: la contraseña NO debe exponerse en la respuesta del perfil",
            resPerfil.body.contraseña === undefined && resPerfil.body.password === undefined,
            `Respuesta obtenida: ${JSON.stringify(resPerfil.body)}`
        );

        // Test 4: Consultar perfil con ID de usuario inexistente
        const resNotFound = await sendRequest("/perfil/999999", "GET");
        assert(
            "Retornar 404 al consultar usuario inexistente",
            resNotFound.statusCode === 404 && resNotFound.body.ok === false && resNotFound.body.mensaje === "Usuario no encontrado",
            `Código: ${resNotFound.statusCode}, Respuesta: ${JSON.stringify(resNotFound.body)}`
        );

        // Test 5: Consultar perfil con formato de ID no numérico / inválido
        const resInvalidId = await sendRequest("/perfil/invalid_id_format", "GET");
        assert(
            "Manejar correctamente ID no numérico (HTTP 404)",
            resInvalidId.statusCode === 404 && resInvalidId.body.ok === false,
            `Código: ${resInvalidId.statusCode}, Respuesta: ${JSON.stringify(resInvalidId.body)}`
        );

    } catch (err) {
        console.error("Error inesperado durante las pruebas de perfil:", err);
    } finally {
        // Limpieza de datos de prueba en la BD
        if (testUserId) {
            await query("DELETE FROM usuarios WHERE id = ?", [testUserId]);
            console.log(`\nLimpieza: Usuario de prueba (ID ${testUserId}) eliminado de la BD.`);
        }

        conn.end();

        console.log("\n==================================================");
        console.log(`  RESUMEN DE PRUEBAS: ${passedTests}/${totalTests} PASADAS  `);
        console.log("==================================================");
        process.exit(passedTests === totalTests ? 0 : 1);
    }
}

runPerfilTests();
