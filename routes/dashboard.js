const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyToken = require("../middleware/auth");

router.get("/", verifyToken, async (req, res) => {
  try {
    const { rol,id } = req.usuario;


    // Total usuarios (solo si es admin)
    let totalUsuarios = 0;
    if (rol === "admin") {
      const usuarios = await pool.query("SELECT COUNT(*) FROM usuarios");
      totalUsuarios = usuarios.rows[0].count;
    }

    // Total predios
    let totalPrediosQuery;

    if (rol === "admin") {
      totalPrediosQuery = await pool.query("SELECT COUNT(*) FROM predios");
    } else {
      totalPrediosQuery = await pool.query(
        `SELECT COUNT(*) 
         FROM usuarios_predios 
         WHERE usuario_id = $1`,
        [id]
      );
    }

    const totalPredios = totalPrediosQuery.rows[0].count;

    // Total lotes
    const totalLotes = await pool.query("SELECT COUNT(*) FROM lotes");

    // Superficie total
    const superficie = await pool.query(
      "SELECT COALESCE(SUM(superficie),0) FROM lotes"
    );

    res.json({
      totalUsuarios,
      totalPredios,
      totalLotes: totalLotes.rows[0].count,
      superficieTotal: superficie.rows[0].coalesce
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en dashboard" });
  }
});

module.exports = router;
