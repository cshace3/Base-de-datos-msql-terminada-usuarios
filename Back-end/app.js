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
app.use(express.json());

// Página principal Registro
app.get("/", (req, res) => {
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

app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
});