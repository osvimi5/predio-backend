const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/auth");

// Crear movimiento
router.post("/", verificarToken, async (req, res) => {
  const { predio_id, nombre, documento, tipo } = req.body;

  try {
    if (req.usuario.rol !== "guardia" && req.usuario.rol !== "admin")
      return res.status(403).json({ error: "No autorizado" });

    const nuevo = await pool.query(
      `INSERT INTO movimientos 
       (predio_id, guardia_id, nombre, documento, tipo)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [predio_id, req.usuario.id, nombre, documento, tipo]
    );

    res.json(nuevo.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error registrando movimiento" });
  }
});

router.get("/", async (req, res) => {
  const movimientos = await pool.query(`
    SELECT m.*, p.nombre as predio_nombre
    FROM movimientos m
    JOIN predios p ON m.predio_id = p.id
    ORDER BY m.fecha DESC
    LIMIT 20
  `);

  res.json(movimientos.rows);
});


module.exports = router;
