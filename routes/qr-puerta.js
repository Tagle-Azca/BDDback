const express = require("express");
const Fraccionamiento = require("../models/fraccionamiento");

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

    if (fraccionamiento.fechaExpedicion && new Date() > fraccionamiento.fechaExpedicion) {
      return res.json({ success: false, message: "El código QR ha expirado" });
    }

    res.json({ success: true, message: "QR válido" });

  } catch (error) {
    res.json({ success: false, message: "Error validando código QR" });
  }
});




module.exports = router;