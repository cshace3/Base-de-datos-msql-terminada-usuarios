const mysql = require("mysql2");
const express = require("express");
const path = require("path");

const app = express();
const port = 8080;
const conexion = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "polaris"
});

conexion.connect((err) => {
    if (err) {
        console.log("Error al conectar:", err);
        return;
    }
    console.log("Conectado a MySQL");
});

// Archivos quietos
app.use("/css", express.static(path.join(__dirname, "../css styles")));
app.use("/js", express.static(path.join(__dirname, "../javascript")));
app.use("/img", express.static(path.join(__dirname, "../img")));
app.use("/html", express.static(path.join(__dirname, "../html")));
app.use(express.static(path.join(__dirname, "../html")));
app.use(express.json());
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ ok: false, error: 'JSON malformado' });
    }
    next();
});

// Página principal Registro
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/Registri.html"));
});
app.get("/Registri.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/Registri.html"));
});
app.get("/inicio.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/inicio.html"));
});
app.get("/Productos.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/Productos.html"));
});
app.get("/contacto.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/contacto.html"));
});
app.get("/Actualizar.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/Actualizar.html"));
});
app.post("/registro", (req, res) => {

    const { usuario, correo, contraseña } = req.body;

    const sql = "INSERT INTO usuarios (usuario, correo, contraseña) VALUES (?, ?, ?)";

    conexion.query(sql, [usuario, correo, contraseña], (err, resultado) => {

        if (err) {
            console.log(err);
            return res.json({ ok: false });
        }

        res.json({ ok: true });

    });

});
//Login
app.post("/login", (req, res) => {

    const { usuario, correo, contraseña } = req.body;

    const sql = "SELECT * FROM usuarios WHERE usuario=? AND correo=? AND contraseña=?";

    conexion.query(sql, [usuario, correo, contraseña], (err, resultado) => {

        if (err) {
            console.log(err);
            return res.json({ ok: false });
        }

        if (resultado.length > 0) {
            res.json({ ok: true });
        } else {
            res.json({ ok: false });
        }

    });

});
app.get("/usuarios", (req, res) => {

    const sql = "SELECT * FROM usuarios";

    conexion.query(sql, (err, resultado) => {

        if (err) {
            console.log(err);
            return res.json({ ok: false });
        }

        res.json(resultado);

    });

});

app.put("/actualizar-password", (req, res) => {

    const { usuario, correo, actual, nueva } = req.body;

    const sqlBuscar = "SELECT * FROM usuarios WHERE usuario = ? AND correo = ?";

    conexion.query(sqlBuscar, [usuario, correo], (err, resultado) => {

        if (err) {
            console.log(err);
            return res.json({ mensaje: "Error del servidor" });
        }

        if (resultado.length === 0) {
            return res.json({
                mensaje: "El usuario o el correo son incorrectos"
            });
        }

        if (resultado[0].contraseña !== actual) {
            return res.json({ mensaje: "La contraseña actual es incorrecta" });
        }

        const sqlActualizar = "UPDATE usuarios SET contraseña = ? WHERE correo = ?";

        conexion.query(sqlActualizar, [nueva, correo], (err) => {

            if (err) {
                console.log(err);
                return res.json({ mensaje: "No se pudo actualizar la contraseña" });
            }

            res.json({ mensaje: "Contraseña actualizada correctamente" });

        });

    });

});

app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
});