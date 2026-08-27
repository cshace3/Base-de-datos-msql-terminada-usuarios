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
        const payload = JSON.stringify(bodyData);
        const req = http.request({
            hostname: "localhost",
            port: 8080,
            path: path,
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload)
            }
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
        req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log("==================================================");
    console.log("  INICIANDO PRUEBAS DE ACTUALIZAR CONTRASEÑA  ");
    console.log("==================================================\n");

    const testUser = "test_actualizar_user_" + Date.now();
    const testEmail = "test_actualizar_" + Date.now() + "@example.com";
    const oldPassword = "PassOld123";
    const newPassword = "PassNew456";

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
        // Prepare DB: Clean any prior test user and insert fresh user
        await query("DELETE FROM usuarios WHERE correo = ?", [testEmail]);
        await query("INSERT INTO usuarios (usuario, correo, contraseña) VALUES (?, ?, ?)", [
            testUser, testEmail, oldPassword
        ]);
        console.log(`Usuario de prueba creado: ${testUser} (${testEmail})\n`);

        // Test 1: Contraseña actual incorrecta
        const res1 = await sendRequest("/actualizar-password", "PUT", {
            usuario: testUser,
            correo: testEmail,
            actual: "WrongPassword999",
            nueva: newPassword
        });
        assert(
            "Rechazar cuando la contraseña actual es incorrecta",
            res1.body.mensaje === "La contraseña actual es incorrecta",
            `Respuesta obtenida: ${JSON.stringify(res1.body)}`
        );

        // Test 2: Usuario o correo incorrecto
        const res2 = await sendRequest("/actualizar-password", "PUT", {
            usuario: "UsuarioInexistente999",
            correo: testEmail,
            actual: oldPassword,
            nueva: newPassword
        });
        assert(
            "Rechazar cuando el usuario o correo no existe",
            res2.body.mensaje === "El usuario o el correo son incorrectos",
            `Respuesta obtenida: ${JSON.stringify(res2.body)}`
        );

        // Test 3: Actualización exitosa
        const res3 = await sendRequest("/actualizar-password", "PUT", {
            usuario: testUser,
            correo: testEmail,
            actual: oldPassword,
            nueva: newPassword
        });
        assert(
            "Actualizar contraseña correctamente con datos válidos",
            res3.body.mensaje === "Contraseña actualizada correctamente",
            `Respuesta obtenida: ${JSON.stringify(res3.body)}`
        );

        // Test 4: Verificación en Base de Datos
        const dbUser = await query("SELECT contraseña FROM usuarios WHERE correo = ?", [testEmail]);
        assert(
            "Verificar cambio de contraseña en la base de datos MySQL",
            dbUser.length > 0 && dbUser[0].contraseña === newPassword,
            `Contraseña en BD: ${dbUser[0] ? dbUser[0].contraseña : "No encontrado"}`
        );

        // Test 5: Login con la nueva contraseña
        const resLoginNew = await sendRequest("/login", "POST", {
            usuario: testUser,
            correo: testEmail,
            contraseña: newPassword
        });
        assert(
            "Permitir inicio de sesión con la nueva contraseña",
            resLoginNew.body.ok === true,
            `Respuesta login nuevo: ${JSON.stringify(resLoginNew.body)}`
        );

        // Test 6: Login con la antigua contraseña debe fallar
        const resLoginOld = await sendRequest("/login", "POST", {
            usuario: testUser,
            correo: testEmail,
            contraseña: oldPassword
        });
        assert(
            "Bloquear inicio de sesión con la antigua contraseña",
            resLoginOld.body.ok === false,
            `Respuesta login antiguo: ${JSON.stringify(resLoginOld.body)}`
        );

        // Cleanup
        await query("DELETE FROM usuarios WHERE correo = ?", [testEmail]);
        console.log(`\nUsuario de prueba eliminado de la base de datos.`);

    } catch (err) {
        console.error("Error durante la ejecución de las pruebas:", err);
    } finally {
        conn.end();
        console.log("\n==================================================");
        console.log(`  RESUMEN DE PRUEBAS: ${passedTests}/${totalTests} PASADAS  `);
        console.log("==================================================");
        process.exit(passedTests === totalTests ? 0 : 1);
    }
}

runTests();
