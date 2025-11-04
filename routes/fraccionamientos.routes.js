const express = require("express");
const bcrypt = require("bcrypt");
const Fraccionamiento = require("../models/fraccionamiento");
const { validarCampos, manejarError, generarQRLinks } = require('../utils/helpers');
const { validarFraccionamiento } = require('../middleware/validators');
const { sanitizeGeneralText, sanitizeEmail } = require('../utils/stringUtils');

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { nombre, usuario, contrasena, direccion, correo, telefono, periodoMeses } = req.body;

    // Validaciones de longitud mínima (5 caracteres)
    const camposMinimos = { nombre, usuario, contrasena, direccion };
    for (const [campo, valor] of Object.entries(camposMinimos)) {
      if (!valor || valor.trim().length < 5) {
        return res.status(400).json({
          error: `El campo ${campo} debe tener al menos 5 caracteres`
        });
      }
    }

    // Validaciones de longitud máxima
    if (nombre.length > 30) return res.status(400).json({ error: "El nombre no puede exceder 30 caracteres" });
    if (usuario.length > 30) return res.status(400).json({ error: "El usuario no puede exceder 30 caracteres" });
    if (contrasena.length > 30) return res.status(400).json({ error: "La contraseña no puede exceder 30 caracteres" });
    if (direccion.length > 70) return res.status(400).json({ error: "La dirección no puede exceder 70 caracteres" });
    if (correo && correo.length > 64) return res.status(400).json({ error: "El correo no puede exceder 64 caracteres" });
    if (telefono && telefono.length > 15) return res.status(400).json({ error: "El teléfono no puede exceder 15 caracteres" });

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const mesesSuscripcion = periodoMeses || 12;
    const fechaExpiracion = new Date();
    fechaExpiracion.setMonth(fechaExpiracion.getMonth() + parseInt(mesesSuscripcion));
    fechaExpiracion.setHours(23, 59, 59, 999);

    const nuevoFraccionamiento = new Fraccionamiento({
      ...req.body,
      nombre: sanitizeGeneralText(nombre),
      direccion: sanitizeGeneralText(direccion),
      correo: correo ? sanitizeEmail(correo) : '',
      contrasena: hashedPassword,
      fechaExpiracion: fechaExpiracion,
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
    const { nombre, usuario, contrasena, direccion, correo, telefono, extenderMeses } = req.body;

    // Validar campos si se proporcionan
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

    // Si se proporciona contraseña, validar y hashearla
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

    if (extenderMeses && parseInt(extenderMeses) > 0) {
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
    const user = await Fraccionamiento.findOne({ usuario });
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!isMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    res.status(200).json({
      mensaje: "Login exitoso",
      token: "token_simulado",
      user,
    });
  } catch (error) {
    manejarError(res, error, "Error del servidor al iniciar sesión");
  }
});

module.exports = router;