const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const Fraccionamiento = require("../models/fraccionamiento");
const Reporte = require("../models/Reportes");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const validarCampos = (campos, res) => {
  for (const [campo, valor] of Object.entries(campos)) {
    if (!valor) {
      res.status(400).json({ error: `El campo '${campo}' es obligatorio.` });
      return false;
    }
  }
  return true;
};

const manejarError = (res, error, mensaje = "Error interno del servidor", status = 500) => {
  console.error(mensaje, error);
  res.status(status).json({ error: mensaje });
};

const buscarFraccionamiento = async (fraccId) => {
  try {
    return await Fraccionamiento.findById(fraccId);
  } catch (error) {
    throw error;
  }
};

const buscarCasa = (fraccionamiento, numero) => {
  return fraccionamiento.residencias.find(c => c.numero.toString() === numero.toString());
};

const generarQRLinks = (fraccionamientoId, numeroCasa = null) => {
  const baseUrl = 'https://admin-one-livid.vercel.app';
  
  return {
    qrAcceso: `${baseUrl}/Visitas?id=${fraccionamientoId}`,
    qrResidente: numeroCasa ? `${baseUrl}/Visitas?id=${fraccionamientoId}&casa=${numeroCasa}` : null,
    qrVisitantes: `${baseUrl}/Visitas?id=${fraccionamientoId}&tipo=visita`,
    qrAdmin: `${baseUrl}/Admin?id=${fraccionamientoId}`
  };
};

const validarFraccionamiento = async (req, res, next) => {
  try {
    const fracc = await buscarFraccionamiento(req.params.fraccId);
    
    if (!fracc) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }
    
    req.fraccionamiento = fracc;
    next();
  } catch (error) {
    manejarError(res, error);
  }
};

const validarCasa = (req, res, next) => {
  const casa = buscarCasa(req.fraccionamiento, req.params.numero);
  if (!casa) {
    return res.status(404).json({ error: "Casa no encontrada" });
  }
  req.casa = casa;
  next();
};

const validarUsuarioEnFraccionamiento = (fraccionamiento, residenteId) => {
  for (const residencia of fraccionamiento.residencias) {
    const residente = residencia.residentes.find(r => 
      r._id.toString() === residenteId && r.activo === true
    );
    if (residente) return true;
  }
  return false;
};

router.post("/", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.contrasena, 10);
    const nuevoFraccionamiento = new Fraccionamiento({
      ...req.body,
      contrasena: hashedPassword,
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

router.put("/Update/:fraccId", validarFraccionamiento, async (req, res) => {
  const { regenerarQR, ...nuevosDatos } = req.body;

  try {
    if (regenerarQR) {
      const qrLinks = generarQRLinks(req.fraccionamiento._id);
      nuevosDatos.qrVisitas = qrLinks.qrAcceso;
      nuevosDatos.fechaGenerada = new Date();
      const nuevaExp = new Date();
      nuevaExp.setFullYear(nuevaExp.getFullYear() + 1);
      nuevosDatos.fechaExpedicion = nuevaExp;
    }

    const actualizado = await Fraccionamiento.findByIdAndUpdate(
      req.params.fraccId,
      nuevosDatos,
      { new: true }
    );

    res.status(200).json({
      mensaje: "Fraccionamiento actualizado correctamente",
      data: actualizado,
      qr: { link: actualizado.qrVisitas },
    });
  } catch (error) {
    manejarError(res, error, "Error al actualizar fraccionamiento");
  }
});

router.get("/:fraccId/qr-codes", validarFraccionamiento, (req, res) => {
  const qrLinks = generarQRLinks(req.params.fraccId);
  
  const qrCasas = req.fraccionamiento.residencias.map(casa => ({
    numeroCasa: casa.numero,
    qrResidente: generarQRLinks(req.params.fraccId, casa.numero).qrResidente
  }));
  
  res.status(200).json({
    fraccionamiento: {
      nombre: req.fraccionamiento.nombre,
      qrAcceso: qrLinks.qrAcceso,
      qrVisitantes: qrLinks.qrVisitantes,
      qrAdmin: qrLinks.qrAdmin
    },
    casas: qrCasas
  });
});

router.post("/:fraccId/regenerar-qr", validarFraccionamiento, async (req, res) => {
  const { tipo } = req.body;
  
  try {
    const qrLinks = generarQRLinks(req.params.fraccId);
    const resultado = {};
    
    if (tipo === 'all' || tipo === 'acceso') {
      req.fraccionamiento.qrVisitas = qrLinks.qrAcceso;
      resultado.qrAcceso = qrLinks.qrAcceso;
    }
    
    if (tipo === 'all' || tipo === 'visitantes') {
      resultado.qrVisitantes = qrLinks.qrVisitantes;
    }
    
    if (tipo === 'all' || tipo === 'admin') {
      resultado.qrAdmin = qrLinks.qrAdmin;
    }
    
    req.fraccionamiento.fechaGenerada = new Date();
    await req.fraccionamiento.save();
    
    res.status(200).json({
      mensaje: "QR regenerados correctamente",
      qr: resultado
    });
  } catch (error) {
    manejarError(res, error, "Error al regenerar QRs");
  }
});

router.post("/:fraccId/casas", validarFraccionamiento, async (req, res) => {
  try {
    const { numero } = req.body;
    const qrLinks = generarQRLinks(req.params.fraccId, numero);
    
    const nuevaCasa = { 
      numero, 
      residentes: [], 
      activa: true,
      qrResidente: qrLinks.qrResidente
    };
    
    req.fraccionamiento.residencias.push(nuevaCasa);
    await req.fraccionamiento.save();
    
    res.status(201).json({
      fraccionamiento: req.fraccionamiento,
      qrCasa: qrLinks.qrResidente
    });
  } catch (error) {
    manejarError(res, error);
  }
});

router.put("/:fraccId/casas/:numero/toggle", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    req.casa.activa = !req.casa.activa;
    await req.fraccionamiento.save();
    res.status(200).json({ mensaje: "Estado de casa actualizado", activa: req.casa.activa });
  } catch (error) {
    manejarError(res, error, "Error al actualizar estado de la casa");
  }
});

router.post("/:fraccId/casas/:numero/residentes", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    const { nombre, relacion } = req.body;
    req.casa.residentes.push({ nombre, relacion, qrPersonal: uuidv4() });
    await req.fraccionamiento.save();
    res.status(201).json(req.fraccionamiento);
  } catch (error) {
    manejarError(res, error);
  }
});

router.get("/residencias/:fraccId/:numero", validarFraccionamiento, validarCasa, (req, res) => {
  res.status(200).json({ residentes: req.casa.residentes });
});

router.post("/residencias/:fraccId/:numero/login", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    const { residenteId } = req.body;
    const residente = req.casa.residentes.find(r => r._id.toString() === residenteId);
    
    if (!residente) {
      return res.status(404).json({ error: "Residente no encontrado" });
    }
    if (residente.activo) {
      return res.status(400).json({ error: "Este residente ya está registrado" });
    }

    residente.activo = true;
    await req.fraccionamiento.save();
    res.status(200).json({ message: "Sesión registrada exitosamente", residente });
  } catch (error) {
    manejarError(res, error);
  }
});

const enviarNotificacion = async (nombre, motivo, fraccId, residencia, foto, reporteId) => {
  if (!process.env.ONESIGNAL_API_KEY) {
    return;
  }

  try {
    await fetch("https://ingresosbackend.onrender.com/api/notifications/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: nombre,
        body: motivo,
        fraccId,
        residencia,
        foto,
        nombre,
        motivo,
        reporteId,
        tipo: 'solicitud_acceso'
      }),
    });
  } catch (err) {
    console.error("Error al enviar la notificación:", err);
  }
};

const subirImagenCloudinary = async (filePath) => {
  if (!filePath) {
    throw new Error("No se recibió ninguna imagen válida.");
  }

  try {
    const resultado = await cloudinary.uploader.upload(filePath, { folder: "visitas" });
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return resultado.secure_url;
  } catch (error) {
    throw new Error("Error al subir imagen a Cloudinary.");
  }
};

routerrouter.post("/:fraccId/casas/:numero/visitas", 
  validarFraccionamiento, 
  validarCasa, 
  upload.single("FotoVisita"), 
  async (req, res) => {
    try {
      const { nombre: nombreVisitante, motivo } = req.body;

      if (!req.casa.activa) {
        return res.status(403).json({ error: "La casa está desactivada y no puede recibir visitas." });
      }

      const fotoUrl = await subirImagenCloudinary(req.file?.path);

      const reporteCreado = await Reporte.create({
        fraccId: req.params.fraccId,
        numeroCasa: req.params.numero,
        nombre: nombreVisitante,
        motivo,
        foto: fotoUrl,
        tiempo: new Date(),
      });

      if (!req.casa.visitas) req.casa.visitas = [];
      req.casa.visitas.push({
        nombreVisitante,
        motivo,
        foto: fotoUrl,
        fecha: new Date(),
      });

      await req.fraccionamiento.save();

      await enviarNotificacion(
        nombreVisitante,
        motivo,
        req.params.fraccId,
        req.params.numero,
        fotoUrl,
        reporteCreado._id.toString()
      );

      res.status(201).json({ mensaje: "Visita registrada con éxito", foto: fotoUrl });
    } catch (error) {
      manejarError(res, error, "Error al registrar visita");
    }
  }
);

router.get("/:fraccId/casas/:numero/visitas", validarFraccionamiento, validarCasa, (req, res) => {
  if (!req.casa.activa) {
    return res.status(403).json({ error: "La casa está desactivada y no puede recibir visitas." });
  }
  res.status(200).json({ visitas: req.casa.visitas || [] });
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

router.post('/:fraccId/notificacion/abrir-puerta', validarFraccionamiento, async (req, res) => {
  const { residenteId } = req.body;
  
  try {
    const usuarioValido = validarUsuarioEnFraccionamiento(req.fraccionamiento, residenteId);
    if (!usuarioValido) {
      return res.json({ success: false, message: "Residente no autorizado en este fraccionamiento" });
    }

    await Fraccionamiento.updateOne(
      { _id: req.params.fraccId }, 
      { $set: { puerta: true } }
    );
    
    setTimeout(async () => {
      try {
        await Fraccionamiento.updateOne(
          { _id: req.params.fraccId }, 
          { $set: { puerta: false } }
        );
      } catch (error) {
        console.error('Error cerrando puerta automáticamente:', error);
      }
    }, 10000);
    
    res.json({ 
      success: true, 
      message: "Acceso concedido - Puerta abierta",
      accion: "ACEPTADO"
    });

  } catch (error) {
    console.error('Error abriendo puerta desde notificación:', error);
    manejarError(res, error, "Error interno del servidor");
  }
});

router.post('/:fraccId/notificacion/rechazar-acceso', validarFraccionamiento, async (req, res) => {
  const { residenteId, motivo } = req.body;
  
  try {
    const usuarioValido = validarUsuarioEnFraccionamiento(req.fraccionamiento, residenteId);
    if (!usuarioValido) {
      return res.json({ success: false, message: "Residente no autorizado en este fraccionamiento" });
    }

    res.json({ 
      success: true, 
      message: "Acceso denegado correctamente",
      accion: "RECHAZADO"
    });

  } catch (error) {
    console.error('Error rechazando acceso desde notificación:', error);
    manejarError(res, error, "Error al procesar rechazo");
  }
});



module.exports = router;