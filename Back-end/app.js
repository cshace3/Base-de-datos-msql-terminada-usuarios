const mysql = require("mysql2");
const express = require("express");
const path = require("path");

const app = express();
const port = 8080;
const conexion = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "polaris",
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

// ===============================
// PROTECCIÓN DE ADMINISTRADOR
// ===============================

function verificarAdmin(req, res, next) {
  const usuarioId = req.headers["usuario-id"];

  if (!usuarioId) {
    return res.status(401).json({
      ok: false,
      mensaje: "No has iniciado sesión",
    });
  }

  const sql = "SELECT rol FROM usuarios WHERE id = ?";

  conexion.query(sql, [usuarioId], (err, resultado) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        ok: false,
        mensaje: "Error al verificar permisos",
      });
    }

    if (resultado.length === 0) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    if (resultado[0].rol !== "admin") {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permisos de administrador",
      });
    }

    next();
  });
}
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ ok: false, error: "JSON malformado" });
  }
  next();
});

// Página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../html/Portada.html"));
});
//Las páginas
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
//Registro de usuario
app.post("/registro", (req, res) => {
  const { usuario, correo, contraseña } = req.body;

  const sql =
    "INSERT INTO usuarios (usuario, correo, contraseña) VALUES (?, ?, ?)";

  conexion.query(sql, [usuario, correo, contraseña], (err, resultado) => {
    if (err) {
      console.log(err);
      return res.json({ ok: false });
    }

    res.json({ ok: true });
  });
});

// REGISTRO DE VENDEDOR

app.post("/registro-vendedor", (req, res) => {
  const {
    nombre_persona,
    cedula,
    nombre_marca,
    correo,
    contraseña,
    instagram,
    tiktok,
    facebook,
    sitio_web,
  } = req.body;

  // ==========================================
  // VALIDAR CAMPOS OBLIGATORIOS
  // ==========================================

  if (
    !nombre_persona ||
    !cedula ||
    !nombre_marca ||
    !correo ||
    !contraseña ||
    !instagram
  ) {
    return res.json({
      ok: false,
      mensaje: "Completa todos los campos obligatorios",
    });
  }

  // ==========================================
  // CREAR USUARIO
  // ==========================================

  const sqlUsuario = `
  INSERT INTO usuarios
  (usuario, correo, contraseña, rol)
  VALUES (?, ?, ?, ?)
  `;

  conexion.query(
    sqlUsuario,
    [nombre_marca, correo, contraseña, "vendedor"],
    (err, resultadoUsuario) => {
      if (err) {
        console.error("Error al crear usuario vendedor:", err);

        // Error por correo o usuario repetido
        if (err.code === "ER_DUP_ENTRY") {
          return res.json({
            ok: false,
            mensaje: "El correo o nombre de marca ya está registrado",
          });
        }

        return res.json({
          ok: false,
          mensaje: "No se pudo crear la cuenta",
        });
      }

      // ID del usuario recién creado
      const usuarioId = resultadoUsuario.insertId;

      // ==========================================
      // CREAR SOLICITUD DE VENDEDOR
      // ==========================================

      const sqlSolicitud = `
        INSERT INTO solicitudes_vendedores
        (
          usuario_id,
          nombre_persona,
          cedula,
          nombre_marca,
          instagram,
          tiktok,
          facebook,
          sitio_web
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      conexion.query(
        sqlSolicitud,
        [
          usuarioId,
          nombre_persona,
          cedula,
          nombre_marca,
          instagram,
          tiktok || null,
          facebook || null,
          sitio_web || null,
        ],
        (errSolicitud, resultadoSolicitud) => {
          if (errSolicitud) {
            console.error(
              "Error al crear solicitud de vendedor:",
              errSolicitud,
            );

            // Si la solicitud no pudo crearse,
            // eliminamos el usuario que acabamos de crear.

            const sqlEliminar = "DELETE FROM usuarios WHERE id = ?";

            conexion.query(sqlEliminar, [usuarioId], () => {});

            return res.json({
              ok: false,
              mensaje: "No se pudo crear la solicitud de vendedor",
            });
          }

          // ==========================================
          // TODO CORRECTO
          // ==========================================

          res.json({
            ok: true,
            mensaje: "Solicitud de vendedor enviada correctamente",
            id_usuario: usuarioId,
            id_solicitud: resultadoSolicitud.insertId,
          });
        },
      );
    },
  );
});
//Login
app.post("/login", (req, res) => {
  const { usuario, correo, contraseña } = req.body;

  const sql =
    "SELECT * FROM usuarios WHERE usuario=? AND correo=? AND contraseña=?";

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
        usuario: resultado[0].usuario,
        rol: resultado[0].rol,
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
// ===============================
// ADMIN - VER USUARIOS
// ===============================

app.get("/admin/usuarios", verificarAdmin, (req, res) => {
  const sql = `
    SELECT id, usuario, correo, rol
    FROM usuarios
    ORDER BY id DESC
  `;

  conexion.query(sql, (err, resultado) => {
    if (err) {
      console.log("Error al consultar usuarios:", err);

      return res.status(500).json({
        ok: false,
        mensaje: "Error al obtener los usuarios",
      });
    }

    res.json({
      ok: true,
      usuarios: resultado,
    });
  });
});

// ===============================
// ADMIN - EDITAR USUARIO
// ===============================
app.put("/admin/usuarios/:id", verificarAdmin, (req, res) => {
  const id = req.params.id;
  const { usuario, correo, rol } = req.body;

  if (!usuario || !correo || !rol) {
    return res.status(400).json({
      ok: false,
      mensaje: "Todos los campos son obligatorios",
    });
  }

  const sql = `
    UPDATE usuarios
    SET usuario = ?, correo = ?, rol = ?
    WHERE id = ?
  `;

  conexion.query(sql, [usuario, correo, rol, id], (err, resultado) => {
    if (err) {
      console.log("Error al editar usuario:", err);
      return res.status(500).json({
        ok: false,
        mensaje: "No se pudo editar el usuario",
      });
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    res.json({
      ok: true,
      mensaje: "Usuario actualizado correctamente",
    });
  });
});

// ===============================
// ADMIN - ELIMINAR USUARIO
// ===============================
app.delete("/admin/usuarios/:id", verificarAdmin, (req, res) => {
  const id = req.params.id;
  const adminId = req.headers["usuario-id"];

  if (String(id) === String(adminId)) {
    return res.status(400).json({
      ok: false,
      mensaje: "No puedes eliminar tu propia cuenta de administrador",
    });
  }

  const sql = "DELETE FROM usuarios WHERE id = ?";

  conexion.query(sql, [id], (err, resultado) => {
    if (err) {
      console.log("Error al eliminar usuario:", err);
      return res.status(500).json({
        ok: false,
        mensaje: "No se pudo eliminar el usuario",
      });
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    res.json({
      ok: true,
      mensaje: "Usuario eliminado correctamente",
    });
  });
});
// ===============================
// ADMIN - VER SOLICITUDES DE VENDEDORES
// ===============================

app.get("/admin/solicitudes-vendedores", verificarAdmin, (req, res) => {
  const sql = `
    SELECT
      sv.id,
      sv.usuario_id,
      sv.nombre_persona,
      sv.cedula,
      sv.nombre_marca,
      sv.instagram,
      sv.tiktok,
      sv.facebook,
      sv.sitio_web,
      sv.estado,
      sv.motivo_rechazo,
      sv.fecha_solicitud,
      u.correo
    FROM solicitudes_vendedores sv
    INNER JOIN usuarios u ON sv.usuario_id = u.id
    ORDER BY sv.id DESC
  `;

  conexion.query(sql, (err, resultado) => {
    if (err) {
      console.log("Error al consultar solicitudes:", err);

      return res.status(500).json({
        ok: false,
        mensaje: "Error al obtener las solicitudes",
      });
    }

    res.json({
      ok: true,
      solicitudes: resultado,
    });
  });
});
// ===============================
// ADMIN - VER SOLICITUDES DE PRODUCTOS
// ===============================

app.get("/admin/solicitudes-productos", verificarAdmin, (req, res) => {
  const sql = `
    SELECT
      sp.id,
      sp.vendedor_id,
      sp.nombre,
      sp.descripcion,
      sp.precio,
      sp.imagen,
      sp.stock,
      sp.estado,
      sp.motivo_rechazo,
      sp.fecha_solicitud,
      u.usuario,
      u.correo,
      sv.nombre_marca
    FROM solicitudes_productos sp
    INNER JOIN usuarios u
      ON sp.vendedor_id = u.id
    INNER JOIN solicitudes_vendedores sv
      ON sp.vendedor_id = sv.usuario_id
    WHERE sv.estado = 'aprobado'
    ORDER BY sp.id DESC
  `;

  conexion.query(sql, (err, resultado) => {
    if (err) {
      console.log("Error al consultar solicitudes de productos:", err);

      return res.status(500).json({
        ok: false,
        mensaje: "Error al obtener las solicitudes de productos",
      });
    }

    res.json({
      ok: true,
      solicitudes: resultado,
    });
  });
});
// Aprobar solicitud de producto
app.put(
  "/admin/solicitudes-productos/:id/aprobar",
  verificarAdmin,
  (req, res) => {
    const solicitudId = req.params.id;

    const sqlSolicitud = `
      SELECT *
      FROM solicitudes_productos
      WHERE id = ?
    `;

    conexion.query(sqlSolicitud, [solicitudId], (err, resultado) => {
      if (err) {
        console.log("Error al consultar solicitud de producto:", err);

        return res.status(500).json({
          ok: false,
          mensaje: "Error al consultar la solicitud",
        });
      }

      if (resultado.length === 0) {
        return res.status(404).json({
          ok: false,
          mensaje: "Solicitud de producto no encontrada",
        });
      }

      const solicitud = resultado[0];

      if (solicitud.estado === "aprobado") {
        return res.json({
          ok: false,
          mensaje: "Esta solicitud ya fue aprobada",
        });
      }

      if (solicitud.estado === "rechazado") {
        return res.json({
          ok: false,
          mensaje: "Esta solicitud ya fue rechazada",
        });
      }

      const sqlProducto = `
  INSERT INTO productos
  (
    nombre,
    descripcion,
    precio,
    imagen,
    stock,
    vendedor_id
  )
  VALUES (?, ?, ?, ?, ?, ?)
`;

      conexion.query(
        sqlProducto,
        [
          solicitud.nombre,
          solicitud.descripcion,
          solicitud.precio,
          solicitud.imagen,
          solicitud.stock,
          solicitud.vendedor_id,
        ],
        (err, resultadoProducto) => {
          if (err) {
            console.log("Error al crear producto:", err);

            return res.status(500).json({
              ok: false,
              mensaje: "No se pudo crear el producto",
            });
          }

          const sqlActualizar = `
              UPDATE solicitudes_productos
              SET estado = 'aprobado',
                  motivo_rechazo = NULL
              WHERE id = ?
            `;

          conexion.query(sqlActualizar, [solicitudId], (err) => {
            if (err) {
              console.log("Error al actualizar solicitud:", err);

              return res.status(500).json({
                ok: false,
                mensaje:
                  "El producto fue creado, pero no se pudo actualizar la solicitud",
              });
            }

            res.json({
              ok: true,
              mensaje: "Producto aprobado y publicado correctamente",
              id_producto: resultadoProducto.insertId,
            });
          });
        },
      );
    });
  },
);
// Rechazar solicitud de producto
app.put(
  "/admin/solicitudes-productos/:id/rechazar",
  verificarAdmin,
  (req, res) => {
    const solicitudId = req.params.id;
    const { motivo } = req.body;

    if (!motivo || motivo.trim() === "") {
      return res.status(400).json({
        ok: false,
        mensaje: "Debes indicar el motivo del rechazo",
      });
    }

    const sql = `
      UPDATE solicitudes_productos
      SET estado = 'rechazado',
          motivo_rechazo = ?
      WHERE id = ?
        AND estado = 'pendiente'
    `;

    conexion.query(sql, [motivo.trim(), solicitudId], (err, resultado) => {
      if (err) {
        console.log("Error al rechazar producto:", err);

        return res.status(500).json({
          ok: false,
          mensaje: "No se pudo rechazar la solicitud",
        });
      }

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          ok: false,
          mensaje: "Solicitud no encontrada o ya fue procesada",
        });
      }

      res.json({
        ok: true,
        mensaje: "Solicitud de producto rechazada correctamente",
      });
    });
  },
);

// ===============================
// ADMIN - APROBAR VENDEDOR
// ===============================

app.put(
  "/admin/solicitudes-vendedores/:id/aprobar",
  verificarAdmin,
  (req, res) => {
    const solicitudId = req.params.id;

    const sqlSolicitud = `
      SELECT usuario_id, estado
      FROM solicitudes_vendedores
      WHERE id = ?
    `;

    conexion.query(sqlSolicitud, [solicitudId], (err, resultado) => {
      if (err) {
        console.log("Error al consultar solicitud:", err);

        return res.status(500).json({
          ok: false,
          mensaje: "Error al consultar la solicitud",
        });
      }

      if (resultado.length === 0) {
        return res.status(404).json({
          ok: false,
          mensaje: "Solicitud no encontrada",
        });
      }

      const solicitud = resultado[0];

      if (solicitud.estado === "aprobado") {
        return res.json({
          ok: false,
          mensaje: "Esta solicitud ya fue aprobada",
        });
      }

      const usuarioId = solicitud.usuario_id;

      // Cambiar el estado de la solicitud
      const actualizarSolicitud = `
          UPDATE solicitudes_vendedores
          SET estado = 'aprobado',
              motivo_rechazo = NULL
          WHERE id = ?
        `;

      conexion.query(actualizarSolicitud, [solicitudId], (err) => {
        if (err) {
          console.log("Error al aprobar solicitud:", err);

          return res.status(500).json({
            ok: false,
            mensaje: "No se pudo aprobar la solicitud",
          });
        }

        // Convertir al usuario en vendedor
        const actualizarUsuario = `
              UPDATE usuarios
              SET rol = 'vendedor'
              WHERE id = ?
            `;

        conexion.query(actualizarUsuario, [usuarioId], (err) => {
          if (err) {
            console.log("Error al actualizar rol del usuario:", err);

            return res.status(500).json({
              ok: false,
              mensaje:
                "La solicitud se aprobó, pero no se pudo actualizar el rol",
            });
          }

          res.json({
            ok: true,
            mensaje: "Vendedor aprobado correctamente",
          });
        });
      });
    });
  },
);

// ===============================
// ADMIN - RECHAZAR VENDEDOR
// ===============================

app.put(
  "/admin/solicitudes-vendedores/:id/rechazar",
  verificarAdmin,
  (req, res) => {
    const solicitudId = req.params.id;
    const { motivo } = req.body;

    if (!motivo || motivo.trim() === "") {
      return res.status(400).json({
        ok: false,
        mensaje: "Debes indicar el motivo del rechazo",
      });
    }

    const sql = `
      UPDATE solicitudes_vendedores
      SET estado = 'rechazado',
          motivo_rechazo = ?
      WHERE id = ?
    `;

    conexion.query(sql, [motivo.trim(), solicitudId], (err, resultado) => {
      if (err) {
        console.log("Error al rechazar solicitud:", err);

        return res.status(500).json({
          ok: false,
          mensaje: "No se pudo rechazar la solicitud",
        });
      }

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          ok: false,
          mensaje: "Solicitud no encontrada",
        });
      }

      res.json({
        ok: true,
        mensaje: "Solicitud rechazada correctamente",
      });
    });
  },
);
// ===============================
// VENDEDOR - OBTENER INFORMACIÓN DE SU MARCA
// ===============================

app.get("/vendedor/:id", (req, res) => {
  const usuarioId = req.params.id;

  const sql = `
    SELECT
      u.id,
      u.usuario,
      u.correo,
      u.rol,
      sv.nombre_persona,
      sv.cedula,
      sv.nombre_marca,
      sv.instagram,
      sv.tiktok,
      sv.facebook,
      sv.sitio_web,
      sv.estado
    FROM usuarios u
    INNER JOIN solicitudes_vendedores sv
      ON u.id = sv.usuario_id
    WHERE u.id = ?
      AND u.rol = 'vendedor'
      AND sv.estado = 'aprobado'
    ORDER BY sv.id DESC
    LIMIT 1
  `;

  conexion.query(sql, [usuarioId], (err, resultado) => {
    if (err) {
      console.log("Error al obtener información del vendedor:", err);

      return res.status(500).json({
        ok: false,
        mensaje: "Error al obtener la información del vendedor",
      });
    }

    if (resultado.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Vendedor no encontrado o no aprobado",
      });
    }

    res.json({
      ok: true,
      vendedor: resultado[0],
    });
  });
});
// ===============================
// VENDEDOR - SOLICITAR PRODUCTO
// ===============================

app.post("/vendedor/productos", (req, res) => {
  const { vendedor_id, nombre, descripcion, precio, imagen, stock } = req.body;

  if (
    !vendedor_id ||
    !nombre ||
    !descripcion ||
    precio === undefined ||
    stock === undefined
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Completa todos los campos obligatorios",
    });
  }

  const verificarVendedor = `
    SELECT id
    FROM usuarios
    WHERE id = ?
      AND rol = 'vendedor'
  `;

  conexion.query(verificarVendedor, [vendedor_id], (err, resultado) => {
    if (err) {
      console.log("Error al verificar vendedor:", err);

      return res.status(500).json({
        ok: false,
        mensaje: "Error al verificar el vendedor",
      });
    }

    if (resultado.length === 0) {
      return res.status(403).json({
        ok: false,
        mensaje: "El usuario no es un vendedor autorizado",
      });
    }

    const sql = `
        INSERT INTO solicitudes_productos
        (
          vendedor_id,
          nombre,
          descripcion,
          precio,
          imagen,
          stock
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `;

    conexion.query(
      sql,
      [
        vendedor_id,
        nombre.trim(),
        descripcion.trim(),
        precio,
        imagen || null,
        stock,
      ],
      (err, resultado) => {
        if (err) {
          console.log("Error al crear solicitud de producto:", err);

          return res.status(500).json({
            ok: false,
            mensaje: "No se pudo enviar la solicitud",
          });
        }

        res.json({
          ok: true,
          mensaje: "Solicitud de producto enviada correctamente",
          id_solicitud: resultado.insertId,
        });
      },
    );
  });
});
//id del vendedor y sus productos
app.get("/vendedor/:id/productos", (req, res) => {
  const vendedorId = req.params.id;

  const sql = `
    SELECT
      id,
      nombre,
      descripcion,
      precio,
      imagen,
      stock
    FROM productos
    WHERE vendedor_id = ?
    ORDER BY id DESC
  `;

  conexion.query(sql, [vendedorId], (err, resultado) => {
    if (err) {
      console.log("Error al obtener productos del vendedor:", err);

      return res.status(500).json({
        ok: false,
        mensaje: "Error al obtener los productos"
      });
    }

    res.json({
      ok: true,
      productos: resultado
    });
  });
});
//Pefil
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
        mensaje: "Error al consultar el perfil",
      });
    }

    if (resultado.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    res.json({
      ok: true,
      id_usuario: resultado[0].id,
      usuario: resultado[0].usuario,
      correo: resultado[0].correo,
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
        mensaje: "Error al obtener los productos",
      });
    }

    res.json(resultado);
  });
});
// ===============================
// ADMIN - GESTIONAR PRODUCTOS
// ===============================

app.get("/admin/productos", verificarAdmin, (req, res) => {
  const sql = `
    SELECT id, nombre, descripcion, precio, imagen, stock
    FROM productos
    ORDER BY id DESC
  `;

  conexion.query(sql, (err, resultado) => {
    if (err) {
      console.log("Error al consultar productos:", err);

      return res.status(500).json({
        ok: false,
        mensaje: "Error al obtener los productos",
      });
    }

    res.json({
      ok: true,
      productos: resultado,
    });
  });
});
// ===============================
// ADMIN - AGREGAR PRODUCTO
// ===============================

app.post("/admin/productos", verificarAdmin, (req, res) => {
  const { nombre, descripcion, precio, imagen, stock } = req.body;

  if (!nombre || !descripcion || !precio || !imagen || stock === undefined) {
    return res.status(400).json({
      ok: false,
      mensaje: "Todos los campos son obligatorios",
    });
  }

  const sql = `
    INSERT INTO productos
    (nombre, descripcion, precio, imagen, stock)
    VALUES (?, ?, ?, ?, ?)
  `;

  conexion.query(
    sql,
    [nombre, descripcion, precio, imagen, stock],
    (err, resultado) => {
      if (err) {
        console.log("Error al agregar producto:", err);

        return res.status(500).json({
          ok: false,
          mensaje: "No se pudo agregar el producto",
        });
      }

      res.json({
        ok: true,
        mensaje: "Producto agregado correctamente",
        id: resultado.insertId,
      });
    },
  );
});
// ===============================
// ADMIN - EDITAR PRODUCTO
// ===============================

app.put("/admin/productos/:id", verificarAdmin, (req, res) => {
  const id = req.params.id;

  const { nombre, descripcion, precio, imagen, stock } = req.body;

  if (!nombre || !descripcion || !precio || !imagen || stock === undefined) {
    return res.status(400).json({
      ok: false,
      mensaje: "Todos los campos son obligatorios",
    });
  }

  const sql = `
    UPDATE productos
    SET nombre = ?,
        descripcion = ?,
        precio = ?,
        imagen = ?,
        stock = ?
    WHERE id = ?
  `;

  conexion.query(
    sql,
    [nombre, descripcion, precio, imagen, stock, id],
    (err, resultado) => {
      if (err) {
        console.log("Error al editar producto:", err);

        return res.status(500).json({
          ok: false,
          mensaje: "No se pudo editar el producto",
        });
      }

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          ok: false,
          mensaje: "Producto no encontrado",
        });
      }

      res.json({
        ok: true,
        mensaje: "Producto actualizado correctamente",
      });
    },
  );
});
// ===============================
// ADMIN - ELIMINAR PRODUCTO
// ===============================

app.delete("/admin/productos/:id", verificarAdmin, (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM productos WHERE id = ?";

  conexion.query(sql, [id], (err, resultado) => {
    if (err) {
      console.log("Error al eliminar producto:", err);

      return res.status(500).json({
        ok: false,
        mensaje: "No se pudo eliminar el producto",
      });
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Producto no encontrado",
      });
    }

    res.json({
      ok: true,
      mensaje: "Producto eliminado correctamente",
    });
  });
});
// ===============================
// ADMIN - VER STOCK
// ===============================

app.get("/admin/stock", verificarAdmin, (req, res) => {
  const sql = `
    SELECT id, nombre, stock
    FROM productos
    ORDER BY stock ASC
  `;

  conexion.query(sql, (err, resultado) => {
    if (err) {
      console.log("Error al consultar stock:", err);

      return res.status(500).json({
        ok: false,
        mensaje: "No se pudo consultar el stock",
      });
    }

    res.json({
      ok: true,
      productos: resultado,
    });
  });
});
// ===============================
// ADMINISTRADOR - CUPONES
// ===============================

// Ver todos los cupones
app.get("/admin/cupones", (req, res) => {
  const usuarioId = req.headers["usuario-id"];

  if (!usuarioId) {
    return res.status(401).json({
      ok: false,
      mensaje: "No autorizado",
    });
  }

  const sqlAdmin = "SELECT rol FROM usuarios WHERE id = ?";

  conexion.query(sqlAdmin, [usuarioId], (errorAdmin, resultadoAdmin) => {
    if (errorAdmin) {
      console.error("Error al verificar administrador:", errorAdmin);
      return res.status(500).json({
        ok: false,
        mensaje: "Error al verificar permisos",
      });
    }

    if (resultadoAdmin.length === 0 || resultadoAdmin[0].rol !== "admin") {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permisos de administrador",
      });
    }

    const sql = `
      SELECT 
        c.id,
        c.codigo,
        c.descuento,
        c.producto_id,
        p.nombre AS producto,
        c.fecha_creacion
      FROM cupones c
      INNER JOIN productos p ON c.producto_id = p.id
      ORDER BY c.id DESC
    `;

    conexion.query(sql, (error, resultados) => {
      if (error) {
        console.error("Error al obtener cupones:", error);
        return res.status(500).json({
          ok: false,
          mensaje: "Error al obtener los cupones",
        });
      }

      res.json({
        ok: true,
        cupones: resultados,
      });
    });
  });
});
// Crear cupón
app.post("/admin/cupones", (req, res) => {
  const usuarioId = req.headers["usuario-id"];

  const { codigo, descuento, producto_id } = req.body;

  if (!usuarioId) {
    return res.status(401).json({
      ok: false,
      mensaje: "No autorizado",
    });
  }

  if (!codigo || descuento === undefined || !producto_id) {
    return res.status(400).json({
      ok: false,
      mensaje: "Todos los campos son obligatorios",
    });
  }

  if (Number(descuento) <= 0 || Number(descuento) > 100) {
    return res.status(400).json({
      ok: false,
      mensaje: "El descuento debe estar entre 1% y 100%",
    });
  }

  const sqlAdmin = "SELECT rol FROM usuarios WHERE id = ?";

  conexion.query(sqlAdmin, [usuarioId], (errorAdmin, resultadoAdmin) => {
    if (errorAdmin) {
      console.error("Error al verificar administrador:", errorAdmin);
      return res.status(500).json({
        ok: false,
        mensaje: "Error al verificar permisos",
      });
    }

    if (resultadoAdmin.length === 0 || resultadoAdmin[0].rol !== "admin") {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permisos de administrador",
      });
    }

    const sql = `
      INSERT INTO cupones
      (codigo, descuento, producto_id)
      VALUES (?, ?, ?)
    `;

    conexion.query(
      sql,
      [codigo.trim().toUpperCase(), descuento, producto_id],
      (error, resultado) => {
        if (error) {
          console.error("Error al crear cupón:", error);

          if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
              ok: false,
              mensaje: "Ese código de cupón ya existe",
            });
          }

          if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
              ok: false,
              mensaje: "El producto seleccionado no existe",
            });
          }

          return res.status(500).json({
            ok: false,
            mensaje: "No se pudo crear el cupón",
          });
        }

        res.json({
          ok: true,
          mensaje: "Cupón creado correctamente",
          id: resultado.insertId,
        });
      },
    );
  });
});
// Editar cupón
app.put("/admin/cupones/:id", (req, res) => {
  const usuarioId = req.headers["usuario-id"];
  const idCupon = req.params.id;

  const { codigo, descuento, producto_id } = req.body;

  if (!usuarioId) {
    return res.status(401).json({
      ok: false,
      mensaje: "No autorizado",
    });
  }

  if (!codigo || descuento === undefined || !producto_id) {
    return res.status(400).json({
      ok: false,
      mensaje: "Todos los campos son obligatorios",
    });
  }

  if (Number(descuento) <= 0 || Number(descuento) > 100) {
    return res.status(400).json({
      ok: false,
      mensaje: "El descuento debe estar entre 1% y 100%",
    });
  }

  const sqlAdmin = "SELECT rol FROM usuarios WHERE id = ?";

  conexion.query(sqlAdmin, [usuarioId], (errorAdmin, resultadoAdmin) => {
    if (errorAdmin) {
      return res.status(500).json({
        ok: false,
        mensaje: "Error al verificar permisos",
      });
    }

    if (resultadoAdmin.length === 0 || resultadoAdmin[0].rol !== "admin") {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permisos de administrador",
      });
    }

    const sql = `
      UPDATE cupones
      SET codigo = ?, descuento = ?, producto_id = ?
      WHERE id = ?
    `;

    conexion.query(
      sql,
      [codigo.trim().toUpperCase(), descuento, producto_id, idCupon],
      (error, resultado) => {
        if (error) {
          console.error("Error al editar cupón:", error);

          if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
              ok: false,
              mensaje: "Ese código de cupón ya existe",
            });
          }

          return res.status(500).json({
            ok: false,
            mensaje: "No se pudo editar el cupón",
          });
        }

        if (resultado.affectedRows === 0) {
          return res.status(404).json({
            ok: false,
            mensaje: "Cupón no encontrado",
          });
        }

        res.json({
          ok: true,
          mensaje: "Cupón actualizado correctamente",
        });
      },
    );
  });
});
// Eliminar cupón
app.delete("/admin/cupones/:id", (req, res) => {
  const usuarioId = req.headers["usuario-id"];
  const idCupon = req.params.id;

  if (!usuarioId) {
    return res.status(401).json({
      ok: false,
      mensaje: "No autorizado",
    });
  }

  const sqlAdmin = "SELECT rol FROM usuarios WHERE id = ?";

  conexion.query(sqlAdmin, [usuarioId], (errorAdmin, resultadoAdmin) => {
    if (errorAdmin) {
      return res.status(500).json({
        ok: false,
        mensaje: "Error al verificar permisos",
      });
    }

    if (resultadoAdmin.length === 0 || resultadoAdmin[0].rol !== "admin") {
      return res.status(403).json({
        ok: false,
        mensaje: "No tienes permisos de administrador",
      });
    }

    const sql = "DELETE FROM cupones WHERE id = ?";

    conexion.query(sql, [idCupon], (error, resultado) => {
      if (error) {
        console.error("Error al eliminar cupón:", error);
        return res.status(500).json({
          ok: false,
          mensaje: "No se pudo eliminar el cupón",
        });
      }

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          ok: false,
          mensaje: "Cupón no encontrado",
        });
      }

      res.json({
        ok: true,
        mensaje: "Cupón eliminado correctamente",
      });
    });
  });
});

// ===============================
// USUARIO - VALIDAR CUPÓN
// ===============================
app.post("/cupones/validar", (req, res) => {
  const { codigo } = req.body;

  if (!codigo || typeof codigo !== "string" || !codigo.trim()) {
    return res.status(400).json({
      ok: false,
      mensaje: "Proporcione un código de cupón válido",
    });
  }

  const sql = `
    SELECT 
      c.id,
      c.codigo,
      c.descuento,
      c.producto_id,
      p.nombre AS producto_nombre,
      p.precio AS producto_precio
    FROM cupones c
    INNER JOIN productos p ON c.producto_id = p.id
    WHERE UPPER(c.codigo) = UPPER(?)
  `;

  conexion.query(sql, [codigo.trim()], (error, resultados) => {
    if (error) {
      console.error("Error al validar cupón:", error);
      return res.status(500).json({
        ok: false,
        mensaje: "Error al validar el cupón",
      });
    }

    if (resultados.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "El cupón no existe o no es válido",
      });
    }

    const cupon = resultados[0];
    res.json({
      ok: true,
      mensaje: "Cupón aplicado correctamente",
      cupon: {
        id: cupon.id,
        codigo: cupon.codigo,
        descuento: Number(cupon.descuento),
        producto_id: cupon.producto_id,
        producto_nombre: cupon.producto_nombre,
        producto_precio: Number(cupon.producto_precio),
      },
    });
  });
});

// ===============================
// ADMIN - ACTUALIZAR STOCK
// ===============================
app.put("/admin/stock/:id", verificarAdmin, (req, res) => {
  const id = req.params.id;
  const { stock } = req.body;

  if (stock === undefined || stock === null || Number(stock) < 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "Proporcione una cantidad de stock válida",
    });
  }

  const sql = "UPDATE productos SET stock = ? WHERE id = ?";

  conexion.query(sql, [Number(stock), id], (err, resultado) => {
    if (err) {
      console.log("Error al actualizar stock:", err);
      return res.status(500).json({
        ok: false,
        mensaje: "No se pudo actualizar el stock",
      });
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Producto no encontrado",
      });
    }

    res.json({
      ok: true,
      mensaje: "Stock actualizado correctamente",
    });
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
        mensaje: "Error al obtener el producto",
      });
    }

    if (resultado.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Producto no encontrado",
      });
    }

    res.json({
      ok: true,
      producto: resultado[0],
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
        mensaje: "Error al obtener los favoritos",
      });
    }

    res.json({
      ok: true,
      favoritos: resultado,
    });
  });
});

// Agregar producto a favoritos
app.post("/favoritos/agregar", (req, res) => {
  const { usuario_id, producto_id } = req.body;

  if (!usuario_id || !producto_id) {
    return res.status(400).json({
      ok: false,
      mensaje: "Faltan datos del usuario o del producto",
    });
  }

  const sql = `
        INSERT INTO favoritos
        (usuario_id, producto_id)
        VALUES (?, ?)
    `;

  conexion.query(sql, [usuario_id, producto_id], (err) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.json({
          ok: false,
          mensaje: "El producto ya está en favoritos",
        });
      }

      console.log(err);

      return res.status(500).json({
        ok: false,
        mensaje: "No se pudo agregar a favoritos",
      });
    }

    res.json({
      ok: true,
      mensaje: "Producto agregado a favoritos",
    });
  });
});

// Eliminar producto de favoritos
app.delete("/favoritos/:usuario_id/:producto_id", (req, res) => {
  const usuarioId = req.params.usuario_id;
  const productoId = req.params.producto_id;

  const sql = `
        DELETE FROM favoritos
        WHERE usuario_id = ? AND producto_id = ?
    `;

  conexion.query(sql, [usuarioId, productoId], (err) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        ok: false,
        mensaje: "No se pudo eliminar de favoritos",
      });
    }

    res.json({
      ok: true,
      mensaje: "Producto eliminado de favoritos",
    });
  });
});
// ===============================
// RESEÑAS Y CALIFICACIONES
// ===============================

// Obtener las reseñas de un producto
app.get(
  [
    "/reseñas/:producto_id",
    "/resenas/:producto_id",
    encodeURI("/reseñas/:producto_id"),
  ],
  (req, res) => {
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
          mensaje: "Error al obtener las reseñas",
        });
      }

      res.json({
        ok: true,
        reseñas: resultado,
      });
    });
  },
);

// Agregar una reseña
app.post(
  ["/reseñas/agregar", "/resenas/agregar", encodeURI("/reseñas/agregar")],
  (req, res) => {
    const { usuario_id, producto_id, calificacion, comentario } = req.body;

    if (!usuario_id || !producto_id || !calificacion) {
      return res.status(400).json({
        ok: false,
        mensaje: "Faltan datos para crear la reseña",
      });
    }

    if (calificacion < 1 || calificacion > 5) {
      return res.status(400).json({
        ok: false,
        mensaje: "La calificación debe estar entre 1 y 5",
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
              mensaje: "Ya has calificado este producto",
            });
          }

          console.log(err);

          return res.status(500).json({
            ok: false,
            mensaje: "No se pudo guardar la reseña",
          });
        }

        res.json({
          ok: true,
          mensaje: "Reseña guardada correctamente",
        });
      },
    );
  },
);

// Eliminar una reseña
app.delete(
  ["/reseñas/:id", "/resenas/:id", encodeURI("/reseñas/:id")],
  (req, res) => {
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
          mensaje: "No se pudo eliminar la reseña",
        });
      }

      res.json({
        ok: true,
        mensaje: "Reseña eliminada correctamente",
      });
    });
  },
);
// Agregar al carrito
app.post("/carrito/agregar", (req, res) => {
  console.log("Datos recibidos para carrito:", req.body);

  const { usuario_id, producto_id, cantidad } = req.body;

  // Verificar que se recibieron los datos
  if (!usuario_id || !producto_id) {
    return res.status(400).json({
      ok: false,
      mensaje: "Faltan datos del usuario o del producto",
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
        mensaje: "Error al buscar el carrito",
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
              mensaje: "No se pudo crear el carrito",
            });
          }

          const carritoId = resultadoNuevoCarrito.insertId;

          agregarProductoAlCarrito(carritoId, producto_id, cantidadFinal, res);
        },
      );
    } else {
      // El usuario ya tiene carrito
      const carritoId = resultadoCarrito[0].id;

      agregarProductoAlCarrito(carritoId, producto_id, cantidadFinal, res);
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
        mensaje: "Error al cargar el carrito",
      });
    }

    res.json({
      ok: true,
      carrito: resultado,
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
      mensaje: "Cantidad inválida",
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
        mensaje: "No se pudo actualizar la cantidad",
      });
    }

    res.json({
      ok: true,
      mensaje: "Cantidad actualizada",
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
        mensaje: "No se pudo eliminar el producto",
      });
    }

    res.json({
      ok: true,
      mensaje: "Producto eliminado del carrito",
    });
  });
});
//Agregar al carrito
function agregarProductoAlCarrito(carritoId, productoId, cantidad, res) {
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
          mensaje: "Error al buscar el producto en el carrito",
        });
      }

      // Si ya existe se aumenta la cantidad
      if (resultado.length > 0) {
        const nuevaCantidad = resultado[0].cantidad + cantidad;

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
                mensaje: "No se pudo actualizar la cantidad",
              });
            }

            res.json({
              ok: true,
              mensaje: "Producto agregado al carrito",
            });
          },
        );
      } else {
        // Si no existe se agrega
        const sqlAgregar = `
                    INSERT INTO detalle_carrito
                    (carrito_id, producto_id, cantidad)
                    VALUES (?, ?, ?)
                `;

        conexion.query(sqlAgregar, [carritoId, productoId, cantidad], (err) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              ok: false,
              mensaje: "No se pudo agregar el producto",
            });
          }

          res.json({
            ok: true,
            mensaje: "Producto agregado al carrito",
          });
        });
      }
    },
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
        mensaje: "El usuario o el correo son incorrectos",
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
