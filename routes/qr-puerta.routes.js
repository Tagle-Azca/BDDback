const express = require("express");
const Fraccionamiento = require("../models/fraccionamiento.model");

const router = express.Router();

const buscarFraccionamiento = async (fraccId) => {
  try {
    return await Fraccionamiento.findById(fraccId);
  } catch (error) {
    throw error;
  }
};

const extraerFraccIdDelQR = (qrCode) => {
  try {
    const url = new URL(qrCode);
    return url.searchParams.get('id');
  } catch (error) {
    return null;
  }
};

const validarUsuarioEnFraccionamiento = (fraccionamiento, userId) => {
  for (const residencia of fraccionamiento.residencias) {
    const residente = residencia.residentes.find(r => 
      r._id.toString() === userId && r.activo === true
    );
    if (residente) return true;
  }
  return false;
};

router.post('/validate-qr-access', async (req, res) => {
  const { fraccId, qrCode } = req.body;
  
  try {
    const fraccionamiento = await buscarFraccionamiento(fraccId);
    if (!fraccionamiento) {
      return res.json({ success: false, message: "Fraccionamiento no encontrado" });
    }

    if (!qrCode) {
      return res.json({ success: false, message: "Código QR es requerido" });
    }

    const qrFraccId = extraerFraccIdDelQR(qrCode);
    if (!qrFraccId || qrFraccId !== fraccId) {
      return res.json({ success: false, message: "El código QR no corresponde a este fraccionamiento" });
    }

    res.json({ success: true, message: "QR válido" });
  } catch (error) {
    res.json({ success: false, message: "Error validando código QR" });
  }
});

router.post('/:fraccId/abrir-puerta', async (req, res) => {
  const { userId, qrCode } = req.body;
  
  try {
    const fraccionamiento = await buscarFraccionamiento(req.params.fraccId);
    if (!fraccionamiento) {
      return res.json({ success: false, errorMessage: "Fraccionamiento no encontrado" });
    }

    if (!qrCode) {
      return res.json({ success: false, errorMessage: "Código QR es requerido" });
    }

    const qrFraccId = extraerFraccIdDelQR(qrCode);
    if (!qrFraccId || qrFraccId !== req.params.fraccId) {
      return res.json({ success: false, errorMessage: "El código QR no corresponde a este fraccionamiento" });
    }

    if (userId) {
      const usuarioValido = validarUsuarioEnFraccionamiento(fraccionamiento, userId);
      if (!usuarioValido) {
        return res.json({ success: false, errorMessage: "Usuario no autorizado en este fraccionamiento" });
      }
    }

    await Fraccionamiento.updateOne(
      { _id: req.params.fraccId }, 
      { $set: { puerta: true } }
    );
    
    setTimeout(async () => {
      await Fraccionamiento.updateOne(
        { _id: req.params.fraccId }, 
        { $set: { puerta: false } }
      );
    }, 10000);

    res.json({ success: true, message: "Portón abriendo con exito" });

  } catch (error) {
    res.json({ success: false, errorMessage: "Error interno del servidor" });
  }
});

module.exports = router;