const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: "No autorizado" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "CLAVE_SECRETA");

    req.usuario = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

module.exports = verificarToken;
