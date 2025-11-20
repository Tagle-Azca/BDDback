const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token inválido", error });
  }
};

// Middleware para verificar que el usuario haya cambiado su contraseña
exports.requirePasswordChanged = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Si el token tiene la marca de primerLogin, rechazar el acceso
    if (decoded.primerLogin) {
      return res.status(403).json({
        message: "Debe cambiar su contraseña antes de acceder a esta sección",
        requiresPasswordChange: true,
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token inválido", error });
  }
};
