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

// Simulación del filtro frontend
function buscarProductoFrontend(productosDisponibles, texto) {
    const termino = texto.trim().toLowerCase();
    if (termino === "") return productosDisponibles;
    return productosDisponibles.filter(p =>
        p.nombre.toLowerCase().includes(termino) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(termino))
    );
}

async function runSearchTests() {
    console.log("==================================================");
    console.log("    INICIANDO PRUEBAS DE BÚSQUEDA DE PRODUCTOS    ");
    console.log("==================================================\n");

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
        // 1. Obtener todos los productos de la base de datos
        const todosLosProductos = await query("SELECT * FROM productos");
        console.log(`Productos en base de datos: ${todosLosProductos.length}\n`);

        // Test 1: Búsqueda backend de un término existente por nombre ("Chaqueta")
        const resSearchChaqueta = await sendRequest("/productos?buscar=Chaqueta", "GET");
        const itemsChaqueta = resSearchChaqueta.body;
        assert(
            "Buscar productos por nombre en backend ('Chaqueta')",
            Array.isArray(itemsChaqueta) && itemsChaqueta.length >= 2 &&
            itemsChaqueta.every(p => p.nombre.toLowerCase().includes("chaqueta") || p.descripcion.toLowerCase().includes("chaqueta")),
            `Resultados devueltos: ${JSON.stringify(itemsChaqueta)}`
        );

        // Test 2: Búsqueda backend por palabra en descripción ("tiburon")
        const resSearchTiburon = await sendRequest("/productos?buscar=tiburon", "GET");
        const itemsTiburon = resSearchTiburon.body;
        assert(
            "Buscar productos por descripción en backend ('tiburon')",
            Array.isArray(itemsTiburon) && itemsTiburon.length >= 1 &&
            itemsTiburon.some(p => p.nombre.includes("Bape")),
            `Resultados devueltos: ${JSON.stringify(itemsTiburon)}`
        );

        // Test 3: Búsqueda backend con término inexistente ("xyz_inexistente")
        const resSearchNone = await sendRequest("/productos?buscar=xyz_inexistente", "GET");
        const itemsNone = resSearchNone.body;
        assert(
            "Retornar arreglo vacío para términos sin coincidencias",
            Array.isArray(itemsNone) && itemsNone.length === 0,
            `Resultados devueltos: ${JSON.stringify(itemsNone)}`
        );

        // Test 4: Simulador de filtro frontend - Búsqueda vacía (debe retornar todos)
        const resFrontEmpty = buscarProductoFrontend(todosLosProductos, "");
        assert(
            "Filtrado frontend con cadena vacía retorna todos los productos",
            resFrontEmpty.length === todosLosProductos.length,
            `Obtenidos ${resFrontEmpty.length} de ${todosLosProductos.length}`
        );

        // Test 5: Simulador de filtro frontend - Búsqueda insensible a mayúsculas/minúsculas ("bape")
        const resFrontCase = buscarProductoFrontend(todosLosProductos, "bape");
        assert(
            "Filtrado frontend insensible a mayúsculas/minúsculas ('bape')",
            resFrontCase.length >= 1 && resFrontCase[0].nombre.includes("Bape"),
            `Encontrados: ${resFrontCase.map(p => p.nombre).join(", ")}`
        );

        // Test 6: Simulador de filtro frontend - Búsqueda por marca ("Corteiz")
        const resFrontCorteiz = buscarProductoFrontend(todosLosProductos, "corteiz");
        assert(
            "Filtrado frontend por marca ('corteiz')",
            resFrontCorteiz.length >= 1 && resFrontCorteiz[0].nombre.includes("Corteiz"),
            `Encontrados: ${resFrontCorteiz.map(p => p.nombre).join(", ")}`
        );

    } catch (err) {
        console.error("Error durante las pruebas de búsqueda:", err);
    } finally {
        conn.end();
        console.log("\n==================================================");
        console.log(`  RESUMEN DE PRUEBAS: ${passedTests}/${totalTests} PASADAS  `);
        console.log("==================================================");
        process.exit(passedTests === totalTests ? 0 : 1);
    }
}

runSearchTests();
