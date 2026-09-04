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
app.get("/detalleproducto.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/detalleproducto.html"));
});
app.get("/contacto.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/contacto.html"));
});
app.get("/Actualizar.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/Actualizar.html"));
});
app.get("/perfil.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/perfil.html"));
});
app.get("/favoritos.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/favoritos.html"));
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

            console.log("Usuario encontrado:", resultado[0]);

            res.json({
                ok: true,
                id_usuario: resultado[0].id,
                usuario: resultado[0].usuario
            });

        } else {

            res.json({ ok: false });

        }

    });

});
//Los usuarios
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
app.get("/perfil/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT id, usuario, correo
        FROM usuarios
        WHERE id = ?
    `;

    conexion.query(sql, [id], (err, resultado) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                ok: false,
                mensaje: "Error al consultar el perfil"
            });
        }

        if (resultado.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Usuario no encontrado"
            });
        }

        res.json({
            ok: true,
            id_usuario: resultado[0].id,
            usuario: resultado[0].usuario,
            correo: resultado[0].correo
        });

    });

});
// Los productos
app.get("/productos", (req, res) => {

    const { buscar } = req.query;

    let sql = "SELECT * FROM productos";
    let params = [];

    if (buscar) {
        sql = "SELECT * FROM productos WHERE nombre LIKE ? OR descripcion LIKE ?";
        const termino = `%${buscar}%`;
        params = [termino, termino];
    }

    conexion.query(sql, params, (err, resultado) => {

        if (err) {
            console.log("Error al consultar productos:", err);
            return res.status(500).json({
                ok: false,
                mensaje: "Error al obtener los productos"
            });
        }

        res.json(resultado);

    });

});
// Obtener un producto por su ID
app.get("/productos/:id", (req, res) => {

    const id = req.params.id;

    const sql = "SELECT * FROM productos WHERE id = ?";

    conexion.query(sql, [id], (err, resultado) => {

        if (err) {
            console.log("Error al consultar el producto:", err);

            return res.status(500).json({
                ok: false,
                mensaje: "Error al obtener el producto"
            });
        }

        if (resultado.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Producto no encontrado"
            });
        }

        res.json({
            ok: true,
            producto: resultado[0]
        });

    });

});
// ===============================
// FAVORITOS
// ===============================

// Obtener favoritos de un usuario
app.get("/favoritos/:usuario_id", (req, res) => {

    const usuarioId = req.params.usuario_id;

    const sql = `
        SELECT
            favoritos.id,
            favoritos.producto_id,
            productos.nombre,
            productos.descripcion,
            productos.precio,
            productos.imagen
        FROM favoritos
        INNER JOIN productos
            ON favoritos.producto_id = productos.id
        WHERE favoritos.usuario_id = ?
        ORDER BY favoritos.fecha_agregado DESC
    `;

    conexion.query(sql, [usuarioId], (err, resultado) => {

        if (err) {
            console.log("Error al obtener favoritos:", err);

            return res.status(500).json({
                ok: false,
                mensaje: "Error al obtener los favoritos"
            });
        }

        res.json({
            ok: true,
            favoritos: resultado
        });

    });

});


// Agregar producto a favoritos
app.post("/favoritos/agregar", (req, res) => {

    const { usuario_id, producto_id } = req.body;

    if (!usuario_id || !producto_id) {

        return res.status(400).json({
            ok: false,
            mensaje: "Faltan datos del usuario o del producto"
        });

    }

    const sql = `
        INSERT INTO favoritos
        (usuario_id, producto_id)
        VALUES (?, ?)
    `;

    conexion.query(
        sql,
        [usuario_id, producto_id],
        (err) => {

            if (err) {

                if (err.code === "ER_DUP_ENTRY") {

                    return res.json({
                        ok: false,
                        mensaje: "El producto ya está en favoritos"
                    });

                }

                console.log(err);

                return res.status(500).json({
                    ok: false,
                    mensaje: "No se pudo agregar a favoritos"
                });

            }

            res.json({
                ok: true,
                mensaje: "Producto agregado a favoritos"
            });

        }
    );

});


// Eliminar producto de favoritos
app.delete("/favoritos/:usuario_id/:producto_id", (req, res) => {

    const usuarioId = req.params.usuario_id;
    const productoId = req.params.producto_id;

    const sql = `
        DELETE FROM favoritos
        WHERE usuario_id = ? AND producto_id = ?
    `;

    conexion.query(
        sql,
        [usuarioId, productoId],
        (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    ok: false,
                    mensaje: "No se pudo eliminar de favoritos"
                });

            }

            res.json({
                ok: true,
                mensaje: "Producto eliminado de favoritos"
            });

        }
    );

});
// ===============================
// RESEÑAS Y CALIFICACIONES
// ===============================

// Obtener las reseñas de un producto
app.get(["/reseñas/:producto_id", "/resenas/:producto_id", encodeURI("/reseñas/:producto_id")], (req, res) => {

    const productoId = req.params.producto_id;

    const sql = `
        SELECT
            reseñas.id,
            reseñas.usuario_id,
            usuarios.usuario,
            reseñas.calificacion,
            reseñas.comentario,
            reseñas.fecha_creacion
        FROM reseñas
        INNER JOIN usuarios
            ON reseñas.usuario_id = usuarios.id
        WHERE reseñas.producto_id = ?
        ORDER BY reseñas.fecha_creacion DESC
    `;

    conexion.query(sql, [productoId], (err, resultado) => {

        if (err) {
            console.log("Error al obtener reseñas:", err);

            return res.status(500).json({
                ok: false,
                mensaje: "Error al obtener las reseñas"
            });
        }

        res.json({
            ok: true,
            reseñas: resultado
        });

    });

});


// Agregar una reseña
app.post(["/reseñas/agregar", "/resenas/agregar", encodeURI("/reseñas/agregar")], (req, res) => {

    const {
        usuario_id,
        producto_id,
        calificacion,
        comentario
    } = req.body;

    if (!usuario_id || !producto_id || !calificacion) {

        return res.status(400).json({
            ok: false,
            mensaje: "Faltan datos para crear la reseña"
        });

    }

    if (calificacion < 1 || calificacion > 5) {

        return res.status(400).json({
            ok: false,
            mensaje: "La calificación debe estar entre 1 y 5"
        });

    }

    const sql = `
        INSERT INTO reseñas
        (usuario_id, producto_id, calificacion, comentario)
        VALUES (?, ?, ?, ?)
    `;

    conexion.query(
        sql,
        [usuario_id, producto_id, calificacion, comentario || ""],
        (err) => {

            if (err) {

                if (err.code === "ER_DUP_ENTRY") {

                    return res.json({
                        ok: false,
                        mensaje: "Ya has calificado este producto"
                    });

                }

                console.log(err);

                return res.status(500).json({
                    ok: false,
                    mensaje: "No se pudo guardar la reseña"
                });

            }

            res.json({
                ok: true,
                mensaje: "Reseña guardada correctamente"
            });

        }
    );

});


// Eliminar una reseña
app.delete(["/reseñas/:id", "/resenas/:id", encodeURI("/reseñas/:id")], (req, res) => {

    const idReseña = req.params.id;

    const sql = `
        DELETE FROM reseñas
        WHERE id = ?
    `;

    conexion.query(sql, [idReseña], (err) => {

        if (err) {

            console.log(err);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo eliminar la reseña"
            });

        }

        res.json({
            ok: true,
            mensaje: "Reseña eliminada correctamente"
        });

    });

});
// Agregar al carrito
app.post("/carrito/agregar", (req, res) => {

    console.log("Datos recibidos para carrito:", req.body);

    const { usuario_id, producto_id, cantidad } = req.body;

    // Verificar que se recibieron los datos
    if (!usuario_id || !producto_id) {
        return res.status(400).json({
            ok: false,
            mensaje: "Faltan datos del usuario o del producto"
        });
    }

    const cantidadFinal = cantidad || 1;

    // Buscar si el usuario ya tiene un carrito
    const sqlCarrito = "SELECT id FROM carrito WHERE usuario_id = ?";

    conexion.query(sqlCarrito, [usuario_id], (err, resultadoCarrito) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                ok: false,
                mensaje: "Error al buscar el carrito"
            });
        }

        // Si el usuario no tiene carrito se crea
        if (resultadoCarrito.length === 0) {

            const sqlCrearCarrito =
                "INSERT INTO carrito (usuario_id, fecha_creacion) VALUES (?, NOW())";

            conexion.query(
                sqlCrearCarrito,
                [usuario_id],
                (err, resultadoNuevoCarrito) => {

                    if (err) {
                        console.log(err);
                        return res.status(500).json({
                            ok: false,
                            mensaje: "No se pudo crear el carrito"
                        });
                    }

                    const carritoId = resultadoNuevoCarrito.insertId;

                    agregarProductoAlCarrito(
                        carritoId,
                        producto_id,
                        cantidadFinal,
                        res
                    );
                }
            );

        } else {

            // El usuario ya tiene carrito
            const carritoId = resultadoCarrito[0].id;

            agregarProductoAlCarrito(
                carritoId,
                producto_id,
                cantidadFinal,
                res
            );
        }
    });
});
//Buscar el carrito de un usuario
app.get("/carrito/:usuario_id", (req, res) => {

    const usuarioId = req.params.usuario_id;

    const sql = `
        SELECT 
            detalle_carrito.id,
            detalle_carrito.producto_id,
            detalle_carrito.cantidad,
            productos.nombre,
            productos.descripcion,
            productos.precio,
            productos.imagen
        FROM carrito
        INNER JOIN detalle_carrito
            ON carrito.id = detalle_carrito.carrito_id
        INNER JOIN productos
            ON detalle_carrito.producto_id = productos.id
        WHERE carrito.usuario_id = ?
    `;

    conexion.query(sql, [usuarioId], (err, resultado) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                ok: false,
                mensaje: "Error al cargar el carrito"
            });
        }

        res.json({
            ok: true,
            carrito: resultado
        });

    });

});
// Actualizar cantidad de un producto en el carrito
app.put("/carrito/cantidad/:id", (req, res) => {

    const idDetalle = req.params.id;
    const { cantidad } = req.body;

    if (!cantidad || cantidad < 1) {
        return res.status(400).json({
            ok: false,
            mensaje: "Cantidad inválida"
        });
    }

    const sql = `
        UPDATE detalle_carrito
        SET cantidad = ?
        WHERE id = ?
    `;

    conexion.query(sql, [cantidad, idDetalle], (err) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo actualizar la cantidad"
            });
        }

        res.json({
            ok: true,
            mensaje: "Cantidad actualizada"
        });

    });

});
// Eliminar producto del carrito
app.delete("/carrito/producto/:id", (req, res) => {

    const idDetalle = req.params.id;

    const sql = `
        DELETE FROM detalle_carrito
        WHERE id = ?
    `;

    conexion.query(sql, [idDetalle], (err) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo eliminar el producto"
            });
        }

        res.json({
            ok: true,
            mensaje: "Producto eliminado del carrito"
        });

    });

});
//Agregar al carrito
function agregarProductoAlCarrito(
    carritoId,
    productoId,
    cantidad,
    res
) {

    // Comprobar si el producto ya está en el carrito
    const sqlBuscarProducto = `
        SELECT id, cantidad
        FROM detalle_carrito
        WHERE carrito_id = ? AND producto_id = ?
    `;

    conexion.query(
        sqlBuscarProducto,
        [carritoId, productoId],
        (err, resultado) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    ok: false,
                    mensaje: "Error al buscar el producto en el carrito"
                });
            }

            // Si ya existe se aumenta la cantidad
            if (resultado.length > 0) {

                const nuevaCantidad =
                    resultado[0].cantidad + cantidad;

                const sqlActualizar = `
                    UPDATE detalle_carrito
                    SET cantidad = ?
                    WHERE id = ?
                `;

                conexion.query(
                    sqlActualizar,
                    [nuevaCantidad, resultado[0].id],
                    (err) => {

                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                ok: false,
                                mensaje: "No se pudo actualizar la cantidad"
                            });
                        }

                        res.json({
                            ok: true,
                            mensaje: "Producto agregado al carrito"
                        });
                    }
                );

            } else {

                // Si no existe se agrega
                const sqlAgregar = `
                    INSERT INTO detalle_carrito
                    (carrito_id, producto_id, cantidad)
                    VALUES (?, ?, ?)
                `;

                conexion.query(
                    sqlAgregar,
                    [carritoId, productoId, cantidad],
                    (err) => {

                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                ok: false,
                                mensaje: "No se pudo agregar el producto"
                            });
                        }

                        res.json({
                            ok: true,
                            mensaje: "Producto agregado al carrito"
                        });
                    }
                );
            }
        }
    );
}
// Actualizar contraseña
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