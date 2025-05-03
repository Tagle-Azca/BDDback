const express = require("express");
const Fraccionamiento = require("../models/fraccionamiento");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

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

//crear fraccionamientos
router.post("/", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.contrasena, 10); // 10 salt rounds
    const nuevoFraccionamiento = new Fraccionamiento({
      ...req.body,
      contrasena: hashedPassword,
    });

    await nuevoFraccionamiento.save();

    const qrId = nuevoFraccionamiento.qrVisitas;
    const qrLink = `https://admin-one-livid.vercel.app/Visitas?id=${qrId}`;

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

//ver todos los fraccionamientos
router.get("/", async (req, res) => {
  try {
    const fraccionamientos = await Fraccionamiento.find();
    res.status(200).json(fraccionamientos);
  } catch (error) {
    console.error("Error al obtener fraccionamientos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

const FraccUser = require("../models/fraccUserModels");


//Agregar casa a un fraccionamiento

router.post("/:fraccId/residencia", async (req, res) => {
  const { fraccId } = req.params;
  const { numero, propietario, telefono } = req.body;

  if (!validarCampos({ numero, propietario, telefono }, res)) return;

  try {
    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado." });

    const nuevaRsidencia = { numero, propietario, telefono, residentes: [] };
    fraccionamiento.residencias.push(nuevaRsidencia);
    await fraccionamiento.save();

    res.status(201).json({
      mensaje: "Casa agregada correctamente",
      data: fraccionamiento,
    });
  } catch (error) {
    console.error("Error al agregar casa:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

//Agregar residente a una casa

router.post("/:fraccId/residencia/:residenciaId/residentes", async (req, res) => {
  const { fraccId, residenciaId } = req.params;
  const { nombre, edad, relacion } = req.body;

  if (!validarCampos({ nombre, edad, relacion }, res)) return;

  try {
    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado." });

    const casa = fraccionamiento.residencias.id(residenciaId);
    if (!casa) return res.status(404).json({ error: "Casa no encontrada." });

    casa.residentes.push({ nombre, edad, relacion });
    await fraccionamiento.save();

    res.status(201).json({
      mensaje: "Residente agregado correctamente",
      data: fraccionamiento,
    });
  } catch (error) {
    console.error("Error al agregar residente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

//Actualizar fraccionamiento

router.put("/:fraccId", async (req, res) => {
  const { fraccId } = req.params;
  const { regenerarQR, ...nuevosDatos } = req.body;

  try {
    if (regenerarQR) {
      const nuevoQR = uuidv4();
      nuevosDatos.qrVisitas = nuevoQR;
      nuevosDatos.fechaGenerada = new Date();
      const nuevaExp = new Date();
      nuevaExp.setFullYear(nuevaExp.getFullYear() + 1);
      nuevosDatos.fechaExpedicion = nuevaExp;
    }

    const fraccionamiento = await Fraccionamiento.findByIdAndUpdate(
      fraccId,
      nuevosDatos,
      { new: true }
    );

    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado.", res});

    const qrId = fraccionamiento.qrVisitas;
    const link = `https://admin-one-livid.vercel.app/Visitas?id=${qrId}`;

    res.status(200).json({
      mensaje: "Fraccionamiento actualizado correctamente",
      data: fraccionamiento,
      qr: { link },
    });
  } catch (error) {
    console.error("Error al actualizar fraccionamiento:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


router.post('/:fraccId/abrir-puerta', async (req, res) => {
  const { fraccId } = req.params;
  const { userId, fraccionamiento } = req.body;
  
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

// LOGIN
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
module.exports = router;
