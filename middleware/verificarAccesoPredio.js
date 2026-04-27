const pool = require("../db");

const verificarAccesoPredio = async (req, res, next) => {
  try {
    // Puede venir como :predioId o como :id
    const predioId = req.params.predioId || req.params.id;

    if (!predioId)
      return res.status(400).json({ error: "Predio no especificado" });

    // Si es admin, pasa directo
    if (req.usuario.rol === "admin") {
      return next();
    }

    const permiso = await pool.query(
      "SELECT 1 FROM usuarios_predios WHERE usuario_id=$1 AND predio_id=$2",
      [req.usuario.id, predioId]
    );

    if (permiso.rows.length === 0) {
      return res.status(403).json({ error: "No autorizado" });
    }

    next();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error verificando acceso al predio" });
  }
};

module.exports = verificarAccesoPredio;

