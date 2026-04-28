const express = require("express");
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const router = express.Router();

/* LOGIN */
router.post("/login", async (req, res) => {
  console.log("BODY:", req.body);

  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM usuarios WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0)
    return res.status(401).json({ error: "Datos incorrectos" });

  const usuario = result.rows[0];

  const coincide = await bcrypt.compare(password, usuario.password);

  if (!coincide)
    return res.status(401).json({ error: "Datos incorrectos" });

  const token = jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol
    }
  });
});

module.exports = router;

