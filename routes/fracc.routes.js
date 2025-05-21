const express = require("express");
const Fraccionamiento = require("../models/fraccionamiento");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const router = express.Router();

const validarCampos = (campos, res) => {
  for (const campo in campos) {
    if (!campos[campo]) {
      res.status(400).json({ error: `El campo '${campo}' es obligatorio.` });
      return false;
    }
  }
  return true;
};

// Crear fraccionamiento
router.post("/", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.contrasena, 10);
    const nuevoFraccionamiento = new Fraccionamiento({
      ...req.body,
      contrasena: hashedPassword,
    });
    
    await nuevoFraccionamiento.save();
    
    const qrLink = `https://admin-one-livid.vercel.app/Visitas?id=${nuevoFraccionamiento._id}`;
    
    nuevoFraccionamiento.qrVisitas = qrLink;
    await nuevoFraccionamiento.save();

    res.status(201).json({
      mensaje: "Fraccionamiento creado correctamente",
      data: nuevoFraccionamiento,
      qr: { link: qrLink },
    });
  } catch (error) {
    console.error("Error al crear fraccionamiento:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener todos los fraccionamientos
router.get("/", async (req, res) => {
  try {
    const fraccionamientos = await Fraccionamiento.find();
    res.status(200).json(fraccionamientos);
  } catch (error) {
    console.error("Error al obtener fraccionamientos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Agregar casa
router.post("/:fraccId/casas", async (req, res) => {
  try {
    const { fraccId } = req.params;
    const { numero } = req.body;

    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ mensaje: "Fraccionamiento no encontrado" });

    const nuevaCasa = { numero, residentes: [] };
    fracc.residencias.push(nuevaCasa);
    await fracc.save();

    res.status(201).json(fracc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar residente a una casa
router.post("/:fraccId/casas/:numero/residentes", async (req, res) => {
  try {
    const { fraccId, numero } = req.params;
    const { nombre, edad, relacion } = req.body;

    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ mensaje: "Fraccionamiento no encontrado" });

    const casa = fracc.residencias.find(c => c.numero.toString() === numero.toString());
    if (!casa) return res.status(404).json({ mensaje: "Casa no encontrada" });

    casa.residentes.push({ nombre, edad, relacion, qrPersonal: uuidv4() });
    await fracc.save();

    res.status(201).json(fracc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar fraccionamiento
router.put("/Update/:fraccId", async (req, res) => {
  const { fraccId } = req.params;
  const { regenerarQR, ...nuevosDatos } = req.body;

  try {
    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado." });

    if (regenerarQR) {
      nuevosDatos.qrVisitas = `https://admin-one-livid.vercel.app/Visitas?id=${fraccionamiento._id}`;
      nuevosDatos.fechaGenerada = new Date();
      const nuevaExp = new Date();
      nuevaExp.setFullYear(nuevaExp.getFullYear() + 1);
      nuevosDatos.fechaExpedicion = nuevaExp;
    }

    const actualizado = await Fraccionamiento.findByIdAndUpdate(
      fraccId,
      nuevosDatos,
      { new: true }
    );

    const link = actualizado.qrVisitas;

    res.status(200).json({
      mensaje: "Fraccionamiento actualizado correctamente",
      data: actualizado,
      qr: { link },
    });
  } catch (error) {
    console.error("Error al actualizar fraccionamiento:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener fraccionamiento por ID
router.get("/:fraccId", async (req, res) => {
  try {
    const { fraccId } = req.params;
    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    res.status(200).json(fracc);
  } catch (error) {
    console.error("Error al obtener fraccionamiento:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});
// Abrir puerta
router.post('/:fraccId/abrir-puerta', async (req, res) => {
  const { fraccId } = req.params;
  const { userId } = req.body;

  try {
    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    await Fraccionamiento.updateOne({ _id: fraccId }, { $set: { puerta: true } });
    console.log(`Residente ${userId} abrió el portón del fraccionamiento ${fraccId}`);

    setTimeout(async () => {
      await Fraccionamiento.updateOne({ _id: fraccId }, { $set: { puerta: false } });
      console.log(`Portón del fraccionamiento ${fraccId} cerrado automáticamente`);
    }, 10000);

    res.status(200).json({ message: "Portón abierto correctamente" });
  } catch (error) {
    console.error("Error al abrir puerta:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Rechazar apertura de puerta
router.post('/:fraccId/rechazar-puerta', async (req, res) => {
  const { fraccId } = req.params;
  const { userId } = req.body;

  try {
    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    console.log(`Residente ${userId} rechazó la apertura del portón del fraccionamiento ${fraccId}`);
    res.status(200).json({ message: "Rechazo de apertura registrado correctamente" });
  } catch (error) {
    console.error("Error al registrar rechazo:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Estado del portón
router.get('/:fraccId/estado-puerta', async (req, res) => {
  const { fraccId } = req.params;

  try {
    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    res.status(200).json({ puertaAbierta: fracc.puerta });
  } catch (error) {
    console.error("Error al consultar estado de puerta:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    const user = await Fraccionamiento.findOne({ usuario });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

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
    console.error("Error al hacer login:", error);
    res.status(500).json({ error: "Error del servidor al iniciar sesión" });
  }
});


router.get("/residencias/:fraccId/:numero", async (req, res) => {
  try {
    const { fraccId, numero } = req.params;

    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    const casa = fracc.residencias.find(c => c.numero.toString() === numero.toString());
    if (!casa) return res.status(404).json({ error: "Residencia no encontrada" });

    res.status(200).json({ residentes: casa.residentes });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


router.post("/residencias/:fraccId/:numero/login", async (req, res) => {
  try {
    const { fraccId, numero } = req.params;
    const { residenteId } = req.body;

    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    const casa = fracc.residencias.find(c => c.numero.toString() === numero.toString());
    if (!casa) return res.status(404).json({ error: "Residencia no encontrada" });

    const residente = casa.residentes.find(r => r._id.toString() === residenteId);
    if (!residente) return res.status(404).json({ error: "Residente no encontrado" });

    if (residente.activo) return res.status(400).json({ error: "Este residente ya está registrado" });

    residente.activo = true;
    await fracc.save();

    res.status(200).json({ message: "Sesión registrada exitosamente", residente });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});



module.exports = router;
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const fetch = require("node-fetch");

router.post("/:fraccId/casas/:numero/visitas",upload.single("fotoDni"), async (req, res) => {
  try {
    const { fraccId, numero } = req.params;
    const { nombreVisitante, motivo } = req.body;
    const localPath = req.file?.path;

    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    const casa = fracc.residencias.find(c => c.numero.toString() === numero.toString());
    if (!casa) return res.status(404).json({ error: "Residencia no encontrada" });

    if (!casa.visitas) casa.visitas = [];

    // esto sube imagen a Cloudinary
    let fotoUrl = null;
    if (!req.file || !req.file.path) {
  return res.status(400).json({ error: "No se recibió ninguna imagen válida." });
}

try {
  const resultado = await cloudinary.uploader.upload(req.file.path, {
    folder: "visitas",
  });
  fotoUrl = resultado.secure_url;

  if (fs.existsSync(req.file.path)) {
    fs.unlinkSync(req.file.path);
  }
} catch (error) {
  console.error("❌ Error al subir a Cloudinary:", error);
  return res.status(500).json({ error: "Error al subir imagen a Cloudinary." });
}

    casa.visitas.push({
      nombreVisitante,
      motivo,
      foto: fotoUrl,
      fecha: new Date(),
    });

    await fracc.save();

    const notificacion = {
      title: "Nueva Visita",
      body: `Visita registrada para la casa ${numero}: ${nombreVisitante} - ${motivo}`,
      fraccId,
      residencia: numero,
    };

    try {
      await fetch("https://ingresosbackend.onrender.com/api/notification/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificacion),
      });
    } catch (err) {
      console.error("Error al enviar notificación:", err);
    }

    res.status(201).json({ mensaje: "Visita registrada con éxito", foto: fotoUrl });
  } catch (error) {
    console.error("Error al registrar visita:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/:fraccId/casas/:numero/visitas", async (req, res) => {
  
  try {
    const { fraccId, numero } = req.params;

    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    const casa = fracc.residencias.find(c => c.numero === parseInt(numero));
    if (!casa) return res.status(404).json({ error: "Residencia no encontrada" });

    res.status(200).json({ visitas: casa.visitas || [] });
  } catch (error) {
    console.error("Error al obtener visitas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});