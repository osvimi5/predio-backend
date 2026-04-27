const express = require("express");
const pool = require("../db");
const verificarToken = require("../middleware/auth");
const permitirRoles = require("../middleware/roles");

const router = express.Router();

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

router.get("/pdf/:id", verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 🔹 1. TRAER TURNO
    const turno = await pool.query(
      `SELECT t.*, u.nombre as guardia, p.nombre as predio
       FROM turnos t
       JOIN usuarios u ON u.id = t.usuario_id
       JOIN predios p ON p.id = t.predio_id
       WHERE t.id = $1`,
      [id]
    );

    // 🔹 2. TRAER RECORRIDOS
    const recorridos = await pool.query(
      `SELECT * FROM recorridos
       WHERE turno_id = $1
       ORDER BY hora_inicio ASC`,
      [id]
    );

    // 🔹 3. TRAER FOTOS
    const fotos = await pool.query(
      `SELECT rf.*, r.id as recorrido_id
       FROM recorrido_fotos rf
       JOIN recorridos r ON r.id = rf.recorrido_id
       WHERE r.turno_id = $1`,
      [id]
    );

    // 🔥 HEADER PDF
    

res.setHeader("Content-Type", "application/pdf");
res.setHeader("Content-Disposition", "inline; filename=reporte_turno.pdf");

const doc = new PDFDocument({ margin: 40 });

doc.pipe(res);

const data = turno.rows[0];


// 🟡 ===== HEADER =====
const logoPath = path.join(__dirname, "..", "uploads", "logo.png"); // opcional

if (fs.existsSync(logoPath)) {
  doc.image(logoPath, 40, 30, { width: 60 });
}

doc
  .fontSize(18)
  .text("REPORTE DE TURNO", 120, 40)
  .fontSize(10)
  .text("Sistema de Seguridad", 120, 60);

doc.moveDown(2);

// Línea separadora
doc
  .moveTo(40, 90)
  .lineTo(550, 90)
  .stroke();


// 🟡 ===== DATOS DEL TURNO =====
doc.moveDown();

// Caja gris
const startY = doc.y;

doc
  .rect(40, startY - 5, 500, 70)
  .fillAndStroke("#f5f5f5", "#dddddd");

doc.fillColor("black").text(`Guardia: ${data.guardia}`, 50, startY);
doc.text(`Predio: ${data.predio}`, 50, startY + 15);
doc.text(`Inicio: ${new Date(data.inicio_turno).toLocaleString()}`, 50, startY + 30);
doc.text(`Fin: ${data.fin_turno ? new Date(data.fin_turno).toLocaleString() : "En curso"}`, 50, startY + 45);

doc.moveDown(5);


// 🟡 ===== TABLA DE RECORRIDOS =====
doc.fontSize(14).text("Recorridos", { underline: true });

doc.moveDown(0.5);

// encabezado tabla
// 🟡 TABLA CONFIG
const colInicio = 50;
const colFin = 150;
const colObs = 250;

let y = doc.y;

// 🔹 HEADER TABLA
doc
  .rect(40, y, 500, 20)
  .fill("#333");

doc.fillColor("white").fontSize(10);

doc.text("Inicio", colInicio, y + 5);
doc.text("Fin", colFin, y + 5);
doc.text("Observación", colObs, y + 5);

y += 25;


// 🔹 FILAS
doc.fillColor("black");

for (const r of recorridos.rows) {

  if (y > 700) {
    doc.addPage();
    y = 50;
  }

  // 🧾 TEXTO ALINEADO
  doc.text(r.hora_inicio, colInicio, y);
  doc.text(r.hora_fin || "-", colFin, y);
  doc.text(r.observacion || "-", colObs, y, {
    width: 250
  });

  y += 20;

  // 📸 FOTOS
  const fotosRecorrido = fotos.rows.filter(f => f.recorrido_id === r.id);

  let x = colInicio;
  let maxHeight = 0;

  for (const f of fotosRecorrido) {
    const imgPath = path.join(__dirname, "..", "uploads", f.imagen);

    if (fs.existsSync(imgPath)) {

      doc.image(imgPath, x, y, {
        fit: [100, 100]
      });

      maxHeight = Math.max(maxHeight, 100);

      x += 110;

      // salto de fila de imágenes
      if (x > 450) {
        x = colInicio;
        y += 110;
      }
    }
  }

  // ⬇️ BAJAR SEGÚN IMÁGENES
  y += maxHeight + 10;
}

// 🟡 ===== FOOTER =====
doc.fontSize(8).fillColor("gray");

doc.text(
  `Generado el ${new Date().toLocaleString()}`,
  40,
  780,
  { align: "center" }
);

doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generando PDF" });
  }
});



/* 🔹 OBTENER LOTES DEL PREDIO ASIGNADO
   (Solo guardia) */
router.get("/lotes",
  verificarToken,
  permitirRoles("guardia"),
  async (req, res) => {

    const usuario_id = req.usuario.id;

    try {
      const predio = await pool.query(
        `SELECT predio_id
         FROM usuarios_predios
         WHERE usuario_id = $1`,
        [usuario_id]
      );

      if (predio.rows.length === 0) {
        return res.status(400).json({ error: "No tiene predio asignado" });
      }

      const predio_id = predio.rows[0].predio_id;

      const lotes = await pool.query(
        `SELECT * FROM lotes
         WHERE predio_id = $1
         ORDER BY id ASC`,
        [predio_id]
      );

      res.json(lotes.rows);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error obteniendo lotes" });
    }
  }
);


/* 🔹 OBTENER TURNO ACTIVO (solo guardia) */
router.get("/activo",
  verificarToken,
  permitirRoles("guardia"),
  async (req, res) => {

    const usuario_id = req.usuario.id;

    const turno = await pool.query(
      `SELECT * FROM turnos
       WHERE usuario_id = $1
       AND estado = 'abierto'`,
      [usuario_id]
    );

    res.json(turno.rows[0] || null);
  }
);


/* 🔹 OBTENER PREDIO DEL GUARDIA */
router.get("/predio",
  verificarToken,
  permitirRoles("guardia"),
  async (req, res) => {

    const usuario_id = req.usuario.id;

    const predio = await pool.query(
      `SELECT p.*
       FROM predios p
       JOIN usuarios_predios up ON up.predio_id = p.id
       WHERE up.usuario_id = $1`,
      [usuario_id]
    );

    if (predio.rows.length === 0) {
      return res.status(400).json({ error: "No tiene predio asignado" });
    }

    res.json(predio.rows[0]);
  }
);


/* 🔹 ABRIR TURNO (SOLO GUARDIA) */
router.post("/abrir",
  verificarToken,
  permitirRoles("guardia"),
  async (req, res) => {

    const usuario_id = req.usuario.id;

    try {
      const predio = await pool.query(
        `SELECT predio_id
         FROM usuarios_predios
         WHERE usuario_id = $1`,
        [usuario_id]
      );

      if (predio.rows.length === 0) {
        return res.status(400).json({ error: "No tiene predio asignado" });
      }

      const predio_id = predio.rows[0].predio_id;

      const nuevoTurno = await pool.query(
        `INSERT INTO turnos (usuario_id, predio_id, inicio_turno, estado)
         VALUES ($1, $2, NOW(), 'abierto')
         RETURNING *`,
        [usuario_id, predio_id]
      );

      res.json(nuevoTurno.rows[0]);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error abriendo turno" });
    }
  }
);


/* 🔹 CERRAR TURNO (SOLO GUARDIA) */
router.put("/cerrar/:id",
  verificarToken,
  permitirRoles("guardia"),
  async (req, res) => {

    const { id } = req.params;

    await pool.query(
      `UPDATE turnos
       SET fin_turno = NOW(),
           estado = 'cerrado'
       WHERE id = $1`,
      [id]
    );

    res.json({ mensaje: "Turno cerrado" });
  }
);

router.get(
  "/historial",
  verificarToken,
  permitirRoles("admin", "administrador", "guardia"),
  async (req, res) => {

    const usuario_id = req.usuario.id;
    const rol = req.usuario.rol;

    try {

      let query;
      let params = [];

      // 🔹 SI ES GUARDIA → solo su predio
      if (rol === "guardia") {

        const predio = await pool.query(
          `SELECT predio_id
           FROM usuarios_predios
           WHERE usuario_id = $1`,
          [usuario_id]
        );

        if (predio.rows.length === 0) {
          return res.json([]);
        }

        const predio_id = predio.rows[0].predio_id;

        query = `
          SELECT 
            t.id,
            t.inicio_turno,
            t.fin_turno,
            t.estado,
            u.nombre as guardia,
            p.nombre as predio
          FROM turnos t
          JOIN usuarios u ON u.id = t.usuario_id
          JOIN predios p ON p.id = t.predio_id
          WHERE t.predio_id = $1 AND t.estado = 'cerrado'
          ORDER BY t.inicio_turno DESC
        `;

        params = [predio_id];

      } else {
        // 🔹 ADMIN → ve todo

        query = `
          SELECT 
            t.id,
            t.inicio_turno,
            t.fin_turno,
            t.estado,
            u.nombre as guardia,
            p.nombre as predio
          FROM turnos t
          JOIN usuarios u ON u.id = t.usuario_id
          JOIN predios p ON p.id = t.predio_id
          ORDER BY t.inicio_turno DESC
        `;
      }

      const turnos = await pool.query(query, params);

      res.json(turnos.rows);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error obteniendo historial" });
    }

  }
);
module.exports = router;
