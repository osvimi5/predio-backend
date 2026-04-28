const express = require("express");
const router = express.Router();
const pool = require("../db");
const verificarToken = require("../middleware/auth");
const permitirRoles = require("../middleware/roles");


/* 🔹 REGISTRAR RECORRIDO
   (SOLO GUARDIA) */router.post(
  "/",
  verificarToken,
  permitirRoles("guardia"),
  async (req, res) => {
    try {
      const usuario_id = req.usuario.id;

      const turno = await pool.query(
        `SELECT id FROM turnos 
         WHERE usuario_id=$1 AND estado='abierto'
         LIMIT 1`,
        [usuario_id]
      );

      if (turno.rows.length === 0) {
        return res.status(400).json({ error: "No hay turno activo" });
      }

      const nuevo = await pool.query(
        `INSERT INTO recorridos (turno_id, hora_inicio, observacion)
         VALUES ($1, NOW(), $2)
         RETURNING *`,
        [turno.rows[0].id, req.body.observacion || null]
      );

      res.json(nuevo.rows[0]);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error creando recorrido" });
    }
  }
);

//
/*router.put("/:id", verificarToken, async (req, res) => {
  const { id } = req.params;
  const { hora_inicio, hora_fin, observacion } = req.body;

  try {
    // Verificar que el recorrido pertenezca a un turno abierto del usuario
    const recorrido = await pool.query(
      `SELECT r.id
       FROM recorridos r
       JOIN turnos t ON t.id = r.turno_id
       WHERE r.id = $1
       AND t.usuario_id = $2
       AND t.estado = 'abierto'`,
      [id, req.usuario.id]
    );

    if (recorrido.rows.length === 0) {
      return res.status(403).json({
        error: "No puede modificar este recorrido"
      });
    }

    await pool.query(
      `UPDATE recorridos
       SET hora_inicio=$1,
           hora_fin=$2,
           observacion=$3
       WHERE id=$4`,
      [hora_inicio, hora_fin, observacion, id]
    );

    res.json({ mensaje: "Recorrido actualizado" });

  } catch (error) {
    res.status(500).json({ error: "Error actualizando recorrido" });
  }
});*/

router.put("/:id", verificarToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE recorridos 
       SET hora_fin=NOW(), observacion=$1
       WHERE id=$2`,
      [req.body.observacion, req.params.id]
    );

    res.json({ ok: true });

  } catch (err) {
    res.status(500).json({ error: "Error actualizando" });
  }
});

//
router.delete("/:id", verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    const recorrido = await pool.query(
      `SELECT r.id
       FROM recorridos r
       JOIN turnos t ON t.id = r.turno_id
       WHERE r.id = $1
       AND t.usuario_id = $2
       AND t.estado = 'abierto'`,
      [id, req.usuario.id]
    );

    if (recorrido.rows.length === 0) {
      return res.status(403).json({
        error: "No puede eliminar este recorrido"
      });
    }

    await pool.query(
      `DELETE FROM recorridos WHERE id=$1`,
      [id]
    );

    res.json({ mensaje: "Recorrido eliminado" });

  } catch (error) {
    res.status(500).json({ error: "Error eliminando recorrido" });
  }
});
//
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post(
  "/:id/fotos",
  verificarToken,
  upload.array("imagenes", 10),
  async (req, res) => {
    try {
      for (const file of req.files) {
        await pool.query(
          `INSERT INTO recorrido_fotos (recorrido_id, imagen)
           VALUES ($1,$2)`,
          [req.params.id, file.filename]
        );
      }

      res.json({ ok: true });

    } catch (err) {
      res.status(500).json({ error: "Error subiendo fotos" });
    }
  }
);
//
/* OBTENER FOTOS DE UN RECORRIDO */

router.get("/:id/fotos", verificarToken, async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM recorrido_fotos WHERE recorrido_id=$1`,
    [req.params.id]
  );

  res.json(result.rows);
});//
router.get("/historial",
  verificarToken,
  permitirRoles("guardia"),
  async (req, res) => {

    const usuario_id = req.usuario.id;

    const turnos = await pool.query(
      `SELECT * FROM turnos
       WHERE usuario_id=$1
       ORDER BY inicio_turno DESC`,
      [usuario_id]
    );

    res.json(turnos.rows);
  }
);
//
/* 🔹 OBTENER RECORRIDOS DE UN TURNO
   (SOLO GUARDIA) */
/*router.get("/:turnoId",
  verificarToken,
  permitirRoles("guardia"),
  async (req, res) => {

    const { turnoId } = req.params;

    try {
      const recorridos = await pool.query(
        `SELECT * FROM recorridos
         WHERE turno_id = $1
         ORDER BY hora_inicio ASC`,
        [turnoId]
      );

      res.json(recorridos.rows);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error obteniendo recorridos" });
    }
  }
);*/

router.get("/turno/:turnoId", verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM recorridos
       WHERE turno_id=$1
       ORDER BY hora_inicio ASC`,
      [req.params.turnoId]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});
//

router.get("/por-turno/:turnoId", verificarToken, async (req, res) => {
  const { turnoId } = req.params;

  try {
    const recorridos = await pool.query(`
      SELECT r.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', f.id,
              'imagen', f.imagen
            )
          ) FILTER (WHERE f.id IS NOT NULL), '[]'
        ) as fotos
      FROM recorridos r
      LEFT JOIN recorrido_fotos f ON f.recorrido_id = r.id
      WHERE r.turno_id = $1
      GROUP BY r.id
      ORDER BY r.hora_inicio ASC
    `, [turnoId]);

    res.json(recorridos.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo recorridos" });
  }
});

module.exports = router;