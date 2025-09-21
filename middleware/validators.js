const { buscarFraccionamiento, buscarCasa, manejarError } = require('../utils/helpers');

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

module.exports = {
  validarFraccionamiento,
  validarCasa
};