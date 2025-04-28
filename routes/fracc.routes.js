const express = require("express");
const Fraccionamiento = require("../models/fraccionamiento");
const { v4: uuidv4 } = require("uuid");

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



router.post("/:fraccId/casas", async (req, res) => {
  const { fraccId } = req.params;
  const { numero, propietario, telefono } = req.body;

  if (!validarCampos({ numero, propietario, telefono }, res)) return;

  try {
    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado." });

    const nuevaCasa = { numero, propietario, telefono, residentes: [] };
    fraccionamiento.casas.push(nuevaCasa);
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

router.post("/:fraccId/casas/:casaId/residentes", async (req, res) => {
  const { fraccId, casaId } = req.params;
  const { nombre, edad, relacion } = req.body;

  if (!validarCampos({ nombre, edad, relacion }, res)) return;

  try {
    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado." });

    const casa = fraccionamiento.casas.id(casaId);
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
    const link = `https://ingresos-drab.vercel.app/Visitas?id=${qrId}`;

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

module.exports = router;
