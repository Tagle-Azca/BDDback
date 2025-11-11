const express = require('express');
const router = express.Router();
const { createUserToken, invalidateToken, validateUserStillExists } = require('../middleware/tokenAuth');
const Fraccionamiento = require('../models/fraccionamiento.model');

router.post('/login', async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData || typeof qrData !== 'string') {
      return res.status(400).json({
        error: 'Datos QR inválidos'
      });
    }

    const parts = qrData.split('|');
    if (parts.length !== 3) {
      return res.status(400).json({
        error: 'Formato QR inválido'
      });
    }

    const [fraccId, residencia, residenteId] = parts;

    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({
        error: 'Fraccionamiento no encontrado'
      });
    }

    const casa = fraccionamiento.residencias.find(r =>
      r.numero.toString() === residencia.toString()
    );
    if (!casa) {
      return res.status(404).json({
        error: 'Casa no encontrada'
      });
    }

    if (!casa.activa) {
      return res.status(403).json({
        error: 'Casa desactivada'
      });
    }

    const residente = casa.residentes.find(r =>
      r._id.toString() === residenteId && r.activo === true
    );
    if (!residente) {
      return res.status(403).json({
        error: 'Residente no encontrado o inactivo'
      });
    }

    const tokenData = await createUserToken(
      residenteId,
      fraccId,
      residencia,
      residente.playerId
    );

    res.json({
      success: true,
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      user: {
        id: residente._id,
        nombre: residente.nombre,
        fraccId: fraccId,
        residencia: residencia,
        fraccionamientoNombre: fraccionamiento.nombre
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await invalidateToken(token);
    }

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

router.get('/validate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        valid: false,
        error: 'Token requerido'
      });
    }

    const token = authHeader.substring(7);
    const UserToken = require('../models/user-token.model');

    const userToken = await UserToken.findOne({
      token,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!userToken) {
      return res.status(401).json({
        valid: false,
        error: 'Token inválido o expirado',
        shouldRelogin: true
      });
    }

    res.json({
      valid: true,
      expiresAt: userToken.expiresAt,
      userId: userToken.userId
    });

  } catch (error) {
    res.status(500).json({
      valid: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;