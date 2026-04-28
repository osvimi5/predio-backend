const express = require("express");
const pool = require("../db");
const verificarToken = require("../middleware/auth");

const router = express.Router();


// =============================
// GET TODOS LOS LOTES
// =============================
router.get("/", verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * 
      FROM lotes
      ORDER BY id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener lotes" });
  }
});


// =============================
// GET LOTES POR MANZANA (GIS CORE)
// =============================
router.get("/manzana/:manzanaId", verificarToken, async (req, res) => {
  try {
    const { manzanaId } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM lotes
       WHERE manzana_id = $1
       ORDER BY id DESC`,
      [manzanaId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener lotes por manzana" });
  }
});


// =============================
// GET LOTE POR ID
// =============================
router.get("/:id", verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM lotes WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lote no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener lote" });
  }
});


// =============================
// CREAR LOTE (ADMIN)
// =============================
router.post("/", verificarToken, async (req, res) => {
  if (req.usuario.rol !== "admin") {
    return res.status(403).json({ error: "No autorizado" });
  }

  try {
    const {
      manzana_id,
      numero,
      estado,
      observacion,
      propietario_nombre,
      propietario_telefono,
      poligono
    } = req.body;

    const result = await pool.query(
      `INSERT INTO lotes (
        manzana_id,
        numero,
        estado,
        observacion,
        propietario_nombre,
        propietario_telefono,
        poligono
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        manzana_id,
        numero,
        estado,
        observacion,
        propietario_nombre,
        propietario_telefono,
        JSON.stringify(poligono)
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear lote" });
  }
});


// =============================
// EDITAR LOTE (ADMIN)
// =============================
router.put("/:id", verificarToken, async (req, res) => {
  if (req.usuario.rol !== "admin") {
    return res.status(403).json({ error: "No autorizado" });
  }

  try {
    const {
      numero,
      estado,
      observacion,
      propietario_nombre,
      propietario_telefono
    } = req.body;

    const result = await pool.query(
      `UPDATE lotes SET
        numero = $1,
        estado = $2,
        observacion = $3,
        propietario_nombre = $4,
        propietario_telefono = $5
      WHERE id = $6
      RETURNING *`,
      [
        numero,
        estado,
        observacion,
        propietario_nombre,
        propietario_telefono,
        req.params.id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al editar lote" });
  }
});


// =============================
// ELIMINAR LOTE (ADMIN)
// =============================
router.delete("/:id", verificarToken, async (req, res) => {
  if (req.usuario.rol !== "admin") {
    return res.status(403).json({ error: "No autorizado" });
  }

  try {
    await pool.query(
      "DELETE FROM lotes WHERE id = $1",
      [req.params.id]
    );

    res.json({ mensaje: "Lote eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar lote" });
  }
});

module.exports = router;