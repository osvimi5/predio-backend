const express = require("express");
const cors = require("cors");
const usuariosRoutes = require("./routes/usuarios");

//console.log("UsuariosRoutes cargado:", typeof usuariosRoutes);

const prediosRoutes = require("./routes/predios");
//const usuariosRoutes = require("./routes/usuarios");
const lotesRoutes = require("./routes/lotes");
const manzanasRoutes = require("./routes/manzanas");
const movimientosRoutes = require("./routes/movimientos");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const turnosRoutes = require("./routes/turnos")
const app = express();
app.get("/test", (req, res) => {
  res.json({ ok: true });
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
/* ===========================
   RUTAS API
=========================== */

app.use("/api/predios", prediosRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/lotes", lotesRoutes);
app.use("/api/manzanas", manzanasRoutes);
app.use("/api/turnos",turnosRoutes);
app.use("/api/recorridos", require("./routes/recorridos"));

app.use("/api/movimientos", movimientosRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

/* ===========================
   SERVER
=========================== */

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Servidor API en puerto " + PORT);
});
