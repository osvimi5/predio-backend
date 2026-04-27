const express = require("express");
const pool = require("../db");
const verificarToken = require("../middleware/auth");
const permitirRoles = require("../middleware/roles");

const router = express.Router();

/* 🔹 OBTENER MANZANAS POR PREDIO
   (Todos los usuarios logueados pueden ver) */
router.get("/:predioId", verificarToken, async (req, res) => {
  const { predioId } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM manzanas WHERE predio_id = $1",
      [predioId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo manzanas" });
  }
});


/* 🔹 CREAR MANZANA
   (SOLO ADMIN) */
router.post(
  "/",
  verificarToken,
  permitirRoles("admin"),
  async (req, res) => {
    const { predio_id, numero, poligono } = req.body;

    try {
      const result = await pool.query(
        "INSERT INTO manzanas (predio_id, numero, poligono) VALUES ($1,$2,$3) RETURNING *",
        [predio_id, numero, JSON.stringify(poligono)]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error creando manzana" });
    }
  }
);

module.exports = router;
