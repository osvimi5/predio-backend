const express = require("express");
const pool = require("../db");
const verificarToken = require("../middleware/auth");
const router = express.Router();


router.get("/", verificarToken, async (req, res) => {
  console.log("Usuario desde token:", req.usuario);

  const usuario = req.usuario;
  try {

    // 🟢 ADMIN → ve todos
    if (usuario.rol === "admin") {
      const predios = await pool.query("SELECT * FROM predios ORDER BY id ASC");
      return res.json(predios.rows);
    }

    // 🛡️ GUARDIA → ve solo su predio
    if (usuario.rol === "guardia") {

      const predio = await pool.query(
        `SELECT p.*
         FROM predios p
         JOIN usuarios_predios up ON up.predio_id = p.id
         WHERE up.usuario_id = $1`,
        [usuario.id]
      );

      return res.json(predio.rows);
    }

    // 🔵 Operador (por ahora igual que admin)
    const predios = await pool.query("SELECT * FROM predios ORDER BY id ASC");
    res.json(predios.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo predios" });
  }
});


router.post("/", verificarToken, async (req, res) => {
  if (req.usuario.rol !== "admin")
    return res.status(403).json({ error: "No autorizado" });

  const { nombre, ubicacion, descripcion } = req.body;

  try {
    // 1️⃣ Crear predio
    const result = await pool.query(
      "INSERT INTO predios (nombre, ubicacion, descripcion) VALUES ($1,$2,$3) RETURNING *",
      [nombre, ubicacion, descripcion]
    );

    const predioCreado = result.rows[0];

    // 2️⃣ Asignarlo automáticamente al creador
    await pool.query(
      "INSERT INTO usuarios_predios (usuario_id, predio_id) VALUES ($1,$2)",
      [req.usuario.id, predioCreado.id]
    );

    res.json(predioCreado);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando predio" });
  }
});


router.put("/:id", verificarToken, async (req, res) => {
  if (req.usuario.rol !== "admin")
    return res.status(403).json({ error: "No autorizado" });

  const { id } = req.params;
  const { nombre, ubicacion, descripcion } = req.body;

  const result = await pool.query(
    "UPDATE predios SET nombre=$1, ubicacion=$2, descripcion=$3 WHERE id=$4 RETURNING *",
    [nombre, ubicacion, descripcion, id]
  );

  res.json(result.rows[0]);
});

router.delete("/:id", verificarToken, async (req, res) => {
  if (req.usuario.rol !== "admin")
    return res.status(403).json({ error: "No autorizado" });

  await pool.query("DELETE FROM predios WHERE id=$1", [req.params.id]);

  res.json({ mensaje: "Eliminado" });
});

module.exports = router;
