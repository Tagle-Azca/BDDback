const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const Fraccionamiento = require("../models/fraccionamiento");
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
  const baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://admin-one-livid.vercel.app';
  
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

router.post("/:fraccId/casas/:numero/visitas", 
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

      if (!req.casa.visitas) req.casa.visitas = [];
      req.casa.visitas.push({
        nombreVisitante,
        motivo,
        foto: fotoUrl,
        fecha: new Date(),
      });

      await req.fraccionamiento.save();

      res.status(201).json({ 
        mensaje: "Visita registrada con éxito", 
        foto: fotoUrl,
        visitante: nombreVisitante,
        motivo: motivo,
        casa: req.params.numero,
        fraccId: req.params.fraccId
      });

    } catch (error) {
      manejarError(res, error, "Error al registrar visita");
    }
  }
);

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