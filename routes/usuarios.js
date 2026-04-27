const express = require("express");
const pool = require("../db");
const bcrypt = require("bcrypt");
const verificarToken = require("../middleware/auth");

const router = express.Router();

/* LISTAR USUARIOS (ADMIN) */
router.get("/", verificarToken, async (req, res) => {
  if (req.usuario.rol !== "admin")
    {
     console.log("hola");
    return res.status(403).json({ error: "No autorizado" });
    }
  const result = await pool.query(`
    SELECT 
      u.id,
      u.nombre,
      u.email,
      u.rol,
      COALESCE(
        json_agg(up.predio_id) FILTER (WHERE up.predio_id IS NOT NULL),
        '[]'
      ) AS predios
    FROM usuarios u
    LEFT JOIN usuarios_predios up ON u.id = up.usuario_id
    GROUP BY u.id, u.nombre, u.email, u.rol
    ORDER BY u.id DESC
  `);

  res.json(result.rows);
});

/* CREAR USUARIO */

router.post("/", verificarToken, async (req, res) => {
  if (req.usuario.rol !== "admin")
    return res.status(403).json({ error: "No autorizado" });
  
  const { nombre, email, password, rol, predios } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  if (rol !== "admin" && (!predios || predios.length === 0)) {
    return res.status(400).json({ error: "Debe asignar al menos un predio" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = await pool.query(
      `INSERT INTO usuarios (nombre,email,password,rol)
       VALUES ($1,$2,$3,$4)
       RETURNING id,nombre,email,rol`,
      [nombre, email, passwordHash, rol]
    );

    const usuarioId = nuevoUsuario.rows[0].id;

    if (rol !== "admin" && predios && predios.length > 0) {
      for (let predioId of predios) {
        await pool.query(
          "INSERT INTO usuarios_predios (usuario_id,predio_id) VALUES ($1,$2)",
          [usuarioId, predioId]
        );
      }
    }

    res.json(nuevoUsuario.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});


/* EDITAR USUARIO */
router.put("/:id", verificarToken, async (req, res) => {
  if (req.usuario.rol !== "admin")
    return res.status(403).json({ error: "No autorizado" });

  const { id } = req.params;
  const { nombre, email, rol, predios } = req.body;

  if (!nombre || !email || !rol)
    return res.status(400).json({ error: "Datos incompletos" });

  try {
    // 1️⃣ Actualizar datos básicos
    await pool.query(
      "UPDATE usuarios SET nombre=$1, email=$2, rol=$3 WHERE id=$4",
      [nombre, email, rol, id]
    );

    // 2️⃣ Borrar relaciones actuales
    await pool.query(
      "DELETE FROM usuarios_predios WHERE usuario_id=$1",
      [id]
    );

    // 3️⃣ Si no es admin, insertar nuevos predios
    if (rol !== "admin" && predios && predios.length > 0) {
      for (let predioId of predios) {
        await pool.query(
          "INSERT INTO usuarios_predios (usuario_id, predio_id) VALUES ($1,$2)",
          [id, predioId]
        );
      }
    }

    res.json({ mensaje: "Usuario actualizado" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error actualizando usuario" });
  }
});

/* ELIMINAR USUARIO */
router.delete("/:id", verificarToken, async (req, res) => {

  const { id } = req.params;

  if (req.usuario.rol !== "admin")
    return res.status(403).json({ error: "No autorizado" });

  if (req.usuario.id == id)
    return res.status(400).json({ error: "No puedes eliminarte a ti mismo" });

  try {

    const usuarioExiste = await pool.query(
      "SELECT rol FROM usuarios WHERE id=$1",
      [id]
    );

    if (usuarioExiste.rows.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    if (usuarioExiste.rows[0].rol === "admin") {
      const admins = await pool.query(
        "SELECT COUNT(*) FROM usuarios WHERE rol='admin'"
      );

      if (parseInt(admins.rows[0].count) === 1)
        return res.status(400).json({
          error: "Debe existir al menos un administrador"
        });
    }

    await pool.query("DELETE FROM usuarios_predios WHERE usuario_id=$1", [id]);
    await pool.query("DELETE FROM usuarios WHERE id=$1", [id]);

    res.json({ mensaje: "Usuario eliminado correctamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});

module.exports = router;
