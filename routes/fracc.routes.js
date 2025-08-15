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
const JWT_SECRET = process.env.JWT_SECRET;

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Utilidades
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
  return await Fraccionamiento.findById(fraccId);
};

const buscarCasa = (fraccionamiento, numero) => {
  return fraccionamiento.residencias.find(c => c.numero.toString() === numero.toString());
};

// Generador de QR mejorado para múltiples propósitos
const generarQRLinks = (fraccionamientoId, numeroCasa = null) => {
  const baseUrl = 'https://admin-one-livid.vercel.app';
  
  return {
    // QR para acceso general al fraccionamiento (abre puerta directamente en la app)
    qrAcceso: `${baseUrl}/Visitas?id=${fraccionamientoId}`,
    
    // QR para login de residente específico (va a login en la app o web)
    qrResidente: numeroCasa ? `${baseUrl}/Visitas?id=${fraccionamientoId}&casa=${numeroCasa}` : null,
    
    // QR para visitantes (va a registro de visitas en web)
    qrVisitantes: `${baseUrl}/Visitas?id=${fraccionamientoId}&tipo=visita`,
    
    // QR para administrador (va a panel admin)
    qrAdmin: `${baseUrl}/Admin?id=${fraccionamientoId}`
  };
};

// Middleware para validar fraccionamiento
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

// Middleware para validar casa
const validarCasa = (req, res, next) => {
  const casa = buscarCasa(req.fraccionamiento, req.params.numero);
  if (!casa) {
    return res.status(404).json({ error: "Casa no encontrada" });
  }
  req.casa = casa;
  next();
};

// RUTAS DE FRACCIONAMIENTOS

// Crear fraccionamiento
router.post("/", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.contrasena, 10);
    const nuevoFraccionamiento = new Fraccionamiento({
      ...req.body,
      contrasena: hashedPassword,
    });
    
    await nuevoFraccionamiento.save();
    
    const qrLinks = generarQRLinks(nuevoFraccionamiento._id);
    
    // Guardar el QR principal (para compatibilidad)
    nuevoFraccionamiento.qrVisitas = qrLinks.qrAcceso;
    await nuevoFraccionamiento.save();

    res.status(201).json({
      mensaje: "Fraccionamiento creado correctamente",
      data: nuevoFraccionamiento,
      qr: {
        acceso: qrLinks.qrAcceso,        // Para abrir puerta con la app
        visitantes: qrLinks.qrVisitantes, // Para registro de visitas web
        admin: qrLinks.qrAdmin           // Para panel admin
      },
    });
  } catch (error) {
    manejarError(res, error, "Error al crear fraccionamiento");
  }
});

// Obtener todos los fraccionamientos
router.get("/", async (req, res) => {
  try {
    const fraccionamientos = await Fraccionamiento.find();
    res.status(200).json(fraccionamientos);
  } catch (error) {
    manejarError(res, error, "Error al obtener fraccionamientos");
  }
});

// Obtener fraccionamiento por ID
router.get("/:fraccId", validarFraccionamiento, (req, res) => {
  res.status(200).json(req.fraccionamiento);
});

// Actualizar fraccionamiento
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

// Obtener todos los QR de un fraccionamiento
router.get("/:fraccId/qr-codes", validarFraccionamiento, (req, res) => {
  const qrLinks = generarQRLinks(req.params.fraccId);
  
  // QRs específicos de casas
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

// Regenerar QRs específicos
router.post("/:fraccId/regenerar-qr", validarFraccionamiento, async (req, res) => {
  const { tipo } = req.body; // 'acceso', 'visitantes', 'admin', 'all'
  
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

// RUTAS DE CASAS

// Agregar casa
router.post("/:fraccId/casas", validarFraccionamiento, async (req, res) => {
  try {
    const { numero } = req.body;
    const qrLinks = generarQRLinks(req.params.fraccId, numero);
    
    const nuevaCasa = { 
      numero, 
      residentes: [], 
      activa: true,
      qrResidente: qrLinks.qrResidente // QR específico para esta casa
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

// Activar/desactivar casa
router.put("/:fraccId/casas/:numero/toggle", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    req.casa.activa = !req.casa.activa;
    await req.fraccionamiento.save();
    res.status(200).json({ mensaje: "Estado de casa actualizado", activa: req.casa.activa });
  } catch (error) {
    manejarError(res, error, "Error al actualizar estado de la casa");
  }
});

// RUTAS DE RESIDENTES

// Agregar residente a una casa
router.post("/:fraccId/casas/:numero/residentes", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    const { nombre, edad, relacion } = req.body;
    req.casa.residentes.push({ nombre, edad, relacion, qrPersonal: uuidv4() });
    await req.fraccionamiento.save();
    res.status(201).json(req.fraccionamiento);
  } catch (error) {
    manejarError(res, error);
  }
});

// Obtener residentes de una casa
router.get("/residencias/:fraccId/:numero", validarFraccionamiento, validarCasa, (req, res) => {
  res.status(200).json({ residentes: req.casa.residentes });
});

// Login de residente
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

// CONTROL DE ACCESO

// Función para manejar portón
const manejarPorton = async (req, res, accion) => {
  const { userId } = req.body;
  
  try {
    if (accion === 'abrir') {
      await Fraccionamiento.updateOne({ _id: req.params.fraccId }, { $set: { puerta: true } });
      console.log(`Usuario ${userId} abrió el portón del fraccionamiento ${req.params.fraccId}`);
      
      setTimeout(async () => {
        await Fraccionamiento.updateOne({ _id: req.params.fraccId }, { $set: { puerta: false } });
        console.log(`Portón del fraccionamiento ${req.params.fraccId} cerrado automáticamente`);
      }, 10000);
      
      res.status(200).json({ message: "Portón abierto correctamente" });
    } else {
      console.log(`Usuario ${userId} rechazó la apertura del portón del fraccionamiento ${req.params.fraccId}`);
      res.status(200).json({ message: "Rechazo de apertura registrado correctamente" });
    }
  } catch (error) {
    manejarError(res, error, `Error al ${accion} puerta`);
  }
};

// Abrir puerta
router.post('/:fraccId/abrir-puerta', validarFraccionamiento, (req, res) => manejarPorton(req, res, 'abrir'));

// Rechazar apertura de puerta
router.post('/:fraccId/rechazar-puerta', validarFraccionamiento, (req, res) => manejarPorton(req, res, 'rechazar'));

// Estado del portón
router.get('/:fraccId/estado-puerta', validarFraccionamiento, (req, res) => {
  res.status(200).json({ puertaAbierta: req.fraccionamiento.puerta });
});

// RUTAS DE VISITAS

// Funciones auxiliares para visitas
const enviarNotificacion = async (titulo, cuerpo, fraccId, residencia, foto) => {
  if (!process.env.ONESIGNAL_API_KEY) {
    console.error("❌ ONESIGNAL_API_KEY no definida");
    return;
  }

  try {
    console.log("📤 Enviando notificación a OneSignal...");
    const response = await fetch("https://ingresosbackend.onrender.com/api/notifications/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: titulo,
        body: cuerpo,
        fraccId,
        residencia,
        foto,
      }),
    });
    
    console.log("📩 Resultado de notificación:", response.status);
    const data = await response.json();
    console.log("📨 Detalles:", data);
  } catch (err) {
    console.error("❌ Error al enviar la notificación:", err);
  }
};

const subirImagenCloudinary = async (filePath) => {
  if (!filePath) {
    throw new Error("No se recibió ninguna imagen válida.");
  }

  try {
    const resultado = await cloudinary.uploader.upload(filePath, { folder: "visitas" });
    
    // Eliminar archivo local
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return resultado.secure_url;
  } catch (error) {
    console.error("❌ Error al subir a Cloudinary:", error);
    throw new Error("Error al subir imagen a Cloudinary.");
  }
};

// Registrar visita
router.post("/:fraccId/casas/:numero/visitas", 
  validarFraccionamiento, 
  validarCasa, 
  upload.single("FotoVisita"), 
  async (req, res) => {
    try {
      console.log("✅ Llegó a la ruta de visitas");
      console.log("Body:", req.body);
      console.log("File:", req.file);

      const { nombre: nombreVisitante, motivo } = req.body;

      if (!req.casa.activa) {
        return res.status(403).json({ error: "La casa está desactivada y no puede recibir visitas." });
      }

      // Subir imagen
      const fotoUrl = await subirImagenCloudinary(req.file?.path);

      // Crear reporte
      await Reporte.create({
        fraccId: req.params.fraccId,
        numeroCasa: req.params.numero,
        nombre: nombreVisitante,
        motivo,
        foto: fotoUrl,
        tiempo: new Date(),
        estatus: 'pendiente',
      });

      // Agregar visita a la casa
      if (!req.casa.visitas) req.casa.visitas = [];
      req.casa.visitas.push({
        nombreVisitante,
        motivo,
        foto: fotoUrl,
        fecha: new Date(),
      });

      await req.fraccionamiento.save();

      // Enviar notificación
      await enviarNotificacion(
        "Nueva Visita",
        `Visita registrada para la casa ${req.params.numero}: ${nombreVisitante} - ${motivo}`,
        req.params.fraccId,
        req.params.numero,
        fotoUrl
      );

      res.status(201).json({ mensaje: "Visita registrada con éxito", foto: fotoUrl });
    } catch (error) {
      manejarError(res, error, "Error al registrar visita");
    }
  }
);

// Obtener visitas de una casa
router.get("/:fraccId/casas/:numero/visitas", validarFraccionamiento, validarCasa, (req, res) => {
  if (!req.casa.activa) {
    return res.status(403).json({ error: "La casa está desactivada y no puede recibir visitas." });
  }
  res.status(200).json({ visitas: req.casa.visitas || [] });
});

// LOGIN

// Login de fraccionamiento
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