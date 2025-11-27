const express = require("express");
const bcrypt = require("bcrypt");
const Fraccionamiento = require("../models/fraccionamiento.model");
const { validarCampos, manejarError, generarQRLinks } = require('../utils/helpers');
const { validarFraccionamiento } = require('../middleware/validators');
const { sanitizeGeneralText, sanitizeEmail } = require('../utils/stringUtils');

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { nombre, usuario, contrasena, direccion, correo, telefono, fechaExpiracion, periodoMeses } = req.body;

    const camposMinimos = { nombre, usuario, contrasena, direccion };
    for (const [campo, valor] of Object.entries(camposMinimos)) {
      if (!valor || valor.trim().length < 5) {
        return res.status(400).json({
          error: `El campo ${campo} debe tener al menos 5 caracteres`
        });
      }
    }

    if (nombre.length > 30) return res.status(400).json({ error: "El nombre no puede exceder 30 caracteres" });
    if (usuario.length > 30) return res.status(400).json({ error: "El usuario no puede exceder 30 caracteres" });
    if (contrasena.length > 30) return res.status(400).json({ error: "La contraseña no puede exceder 30 caracteres" });
    if (direccion.length > 70) return res.status(400).json({ error: "La dirección no puede exceder 70 caracteres" });
    if (correo && correo.length > 64) return res.status(400).json({ error: "El correo no puede exceder 64 caracteres" });
    if (telefono && telefono.length > 15) return res.status(400).json({ error: "El teléfono no puede exceder 15 caracteres" });

    const nombreExistente = await Fraccionamiento.findOne({ nombre: sanitizeGeneralText(nombre) });
    if (nombreExistente) {
      return res.status(400).json({ error: "Ya existe un fraccionamiento con ese nombre" });
    }

    const usuarioExistente = await Fraccionamiento.findOne({ usuario });
    if (usuarioExistente) {
      return res.status(400).json({ error: "Ya existe un fraccionamiento con ese usuario" });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    let fechaExpiracionFinal;
    if (fechaExpiracion) {
      fechaExpiracionFinal = new Date(fechaExpiracion);
      fechaExpiracionFinal.setHours(23, 59, 59, 999);
    } else {
      const mesesSuscripcion = periodoMeses || 12;
      fechaExpiracionFinal = new Date();
      fechaExpiracionFinal.setMonth(fechaExpiracionFinal.getMonth() + parseInt(mesesSuscripcion));
      fechaExpiracionFinal.setHours(23, 59, 59, 999);
    }

    const nuevoFraccionamiento = new Fraccionamiento({
      ...req.body,
      nombre: sanitizeGeneralText(nombre),
      direccion: sanitizeGeneralText(direccion),
      correo: correo ? sanitizeEmail(correo) : '',
      contrasena: hashedPassword,
      fechaExpiracion: fechaExpiracionFinal,
    });

    await nuevoFraccionamiento.save();

    const qrLinks = generarQRLinks(nuevoFraccionamiento._id);

    nuevoFraccionamiento.qrVisitas = qrLinks.qrAcceso;
    await nuevoFraccionamiento.save();

    res.status(201).json({
      mensaje: "Fraccionamiento creado correctamente",
      data: nuevoFraccionamiento,
      qr: {
        acceso: qrLinks.qrAcceso,
        visitantes: qrLinks.qrVisitantes,
        admin: qrLinks.qrAdmin
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: `Ya existe un fraccionamiento con ese ${campo === 'nombre' ? 'nombre' : campo}`
      });
    }
    manejarError(res, error, "Error al crear fraccionamiento");
  }
});

router.get("/", async (req, res) => {
  try {
    const fraccionamientos = await Fraccionamiento.find();
    res.status(200).json(fraccionamientos);
  } catch (error) {
    manejarError(res, error, "Error al obtener fraccionamientos");
  }
});

router.get("/:fraccId", validarFraccionamiento, (req, res) => {
  res.status(200).json(req.fraccionamiento);
});

router.put("/:fraccId/toggle", validarFraccionamiento, async (req, res) => {
  try {
    const nuevoEstado = req.fraccionamiento.estado === "activo" ? "inactivo" : "activo";
    req.fraccionamiento.estado = nuevoEstado;
    await req.fraccionamiento.save();

    res.status(200).json({
      mensaje: `Fraccionamiento ${nuevoEstado === "activo" ? "activado" : "desactivado"} exitosamente`,
      estado: nuevoEstado,
      fraccionamiento: {
        _id: req.fraccionamiento._id,
        nombre: req.fraccionamiento.nombre,
        estado: nuevoEstado
      }
    });
  } catch (error) {
    manejarError(res, error, "Error al actualizar estado del fraccionamiento");
  }
});

router.put("/update/:fraccId", validarFraccionamiento, async (req, res) => {
  try {
    const { nombre, usuario, contrasena, direccion, correo, telefono, extenderMeses, fechaExpiracion } = req.body;

    if (nombre !== undefined) {
      if (nombre.trim().length < 5) {
        return res.status(400).json({ error: "El nombre debe tener al menos 5 caracteres" });
      }
      if (nombre.length > 30) {
        return res.status(400).json({ error: "El nombre no puede exceder 30 caracteres" });
      }
      req.fraccionamiento.nombre = sanitizeGeneralText(nombre);
    }

    if (usuario !== undefined) {
      if (usuario.trim().length < 5) {
        return res.status(400).json({ error: "El usuario debe tener al menos 5 caracteres" });
      }
      if (usuario.length > 30) {
        return res.status(400).json({ error: "El usuario no puede exceder 30 caracteres" });
      }
      req.fraccionamiento.usuario = usuario;
    }

    if (direccion !== undefined) {
      if (direccion.trim().length < 5) {
        return res.status(400).json({ error: "La dirección debe tener al menos 5 caracteres" });
      }
      if (direccion.length > 70) {
        return res.status(400).json({ error: "La dirección no puede exceder 70 caracteres" });
      }
      req.fraccionamiento.direccion = sanitizeGeneralText(direccion);
    }

    if (correo !== undefined && correo.trim() !== "") {
      if (correo.length > 64) {
        return res.status(400).json({ error: "El correo no puede exceder 64 caracteres" });
      }
      req.fraccionamiento.correo = sanitizeEmail(correo);
    }

    if (telefono !== undefined && telefono.trim() !== "") {
      if (telefono.length > 15) {
        return res.status(400).json({ error: "El teléfono no puede exceder 15 caracteres" });
      }
      req.fraccionamiento.telefono = telefono;
    }

    if (contrasena !== undefined && contrasena.trim() !== "") {
      if (contrasena.trim().length < 5) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 5 caracteres" });
      }
      if (contrasena.length > 30) {
        return res.status(400).json({ error: "La contraseña no puede exceder 30 caracteres" });
      }
      const hashedPassword = await bcrypt.hash(contrasena, 10);
      req.fraccionamiento.contrasena = hashedPassword;
    }

    if (fechaExpiracion) {
      const nuevaFecha = new Date(fechaExpiracion);
      nuevaFecha.setHours(23, 59, 59, 999);
      req.fraccionamiento.fechaExpiracion = nuevaFecha;
    } else if (extenderMeses && parseInt(extenderMeses) > 0) {
      const fechaActual = req.fraccionamiento.fechaExpiracion || new Date();
      const nuevaFecha = new Date(fechaActual);
      nuevaFecha.setMonth(nuevaFecha.getMonth() + parseInt(extenderMeses));
      nuevaFecha.setHours(23, 59, 59, 999);
      req.fraccionamiento.fechaExpiracion = nuevaFecha;
    }

    await req.fraccionamiento.save();

    res.status(200).json({
      mensaje: "Fraccionamiento actualizado exitosamente",
      fraccionamiento: req.fraccionamiento
    });
  } catch (error) {
    manejarError(res, error, "Error al actualizar fraccionamiento");
  }
});

router.post("/login", async (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!validarCampos({ usuario, contrasena }, res)) return;

  try {
    // Primero intentar buscar en Admin (super admin)
    const Admin = require("../models/admin.model");
    let user = await Admin.findOne({ usuario });
    let isSuperAdmin = false;

    // Si no se encuentra en Admin, buscar en Fraccionamientos
    if (!user) {
      user = await Fraccionamiento.findOne({ usuario });
    } else {
      isSuperAdmin = true;
    }

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!isMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Verificar si es primer login SOLO para fraccionamientos
    if (!isSuperAdmin && user.primerLogin) {
      return res.status(200).json({
        requiresPasswordChange: true,
        tempToken: "temp_" + user._id,
        userId: user._id,
        isSuperAdmin: false,
        mensaje: "Debe cambiar su contraseña antes de continuar",
      });
    }

    // Preparar respuesta según el tipo de usuario
    const userResponse = isSuperAdmin
      ? {
          _id: user._id,
          usuario: user.usuario,
          rol: user.rol,
          isSuperAdmin: true,
        }
      : user;

    res.status(200).json({
      mensaje: "Login exitoso",
      token: "token_simulado",
      user: userResponse,
    });
  } catch (error) {
    manejarError(res, error, "Error del servidor al iniciar sesión");
  }
});

router.post("/change-first-password", async (req, res) => {
  try {
    const { tempToken, newPassword, userId, isSuperAdmin } = req.body;

    if (!tempToken || !newPassword || !userId) {
      return res.status(400).json({
        error: "Token temporal, nueva contraseña y ID de usuario son requeridos",
      });
    }

    // Validar que el tempToken sea válido
    if (!tempToken.startsWith("temp_") || tempToken !== "temp_" + userId) {
      return res.status(401).json({
        error: "Token temporal inválido",
      });
    }

    // Buscar el usuario según el tipo
    const Admin = require("../models/admin.model");
    let user;

    if (isSuperAdmin) {
      user = await Admin.findById(userId);
    } else {
      user = await Fraccionamiento.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Validar que el usuario requiera cambio de contraseña
    if (!user.primerLogin) {
      return res.status(403).json({
        error: "Este usuario ya ha cambiado su contraseña inicial",
      });
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.contrasena);
    if (isSamePassword) {
      return res.status(400).json({
        error: "La nueva contraseña debe ser diferente a la actual",
      });
    }

    // Validar requisitos de contraseña
    if (newPassword.trim().length < 5) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 5 caracteres",
      });
    }

    if (newPassword.length > 30) {
      return res.status(400).json({
        error: "La contraseña no puede exceder 30 caracteres",
      });
    }

    // Actualizar contraseña y marcar que ya no es primer login
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.contrasena = hashedPassword;
    user.primerLogin = false;
    await user.save();

    // Preparar respuesta según el tipo de usuario
    const userResponse = isSuperAdmin
      ? {
          _id: user._id,
          usuario: user.usuario,
          rol: user.rol,
          isSuperAdmin: true,
        }
      : user;

    // Retornar la misma estructura que el login normal
    res.status(200).json({
      mensaje: "Contraseña cambiada exitosamente",
      token: "token_simulado",
      user: userResponse,
    });
  } catch (error) {
    manejarError(res, error, "Error al cambiar la contraseña");
  }
});

module.exports = router;