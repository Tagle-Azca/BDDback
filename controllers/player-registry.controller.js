const PlayerRegistry = require("../models/player-registry.model");
const Fraccionamiento = require("../models/fraccionamiento.model");

const registerDevice = async (req, res) => {
  try {
    const { playerId, fraccId, residencia, userId } = req.body;

    if (!playerId || playerId.trim() === '') {
      return res.status(400).json({ error: "Player ID es requerido" });
    }

    if (!userId) {
      return res.status(400).json({ error: "User ID es requerido para autorización" });
    }

    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }

    const casa = fraccionamiento.residencias.find(c => c.numero.toString() === residencia.toString());
    if (!casa) {
      return res.status(404).json({ error: "Casa no encontrada" });
    }

    const residente = casa.residentes.find(r => r._id.toString() === userId);
    if (!residente) {
      return res.status(403).json({ error: "Usuario no encontrado en esta casa" });
    }

    if (!residente.activo) {
      return res.status(403).json({ error: "Usuario inactivo, no puede registrar dispositivo" });
    }

    await PlayerRegistry.deleteMany({ userId: userId });

    await PlayerRegistry.create({
      playerId: playerId,
      fraccId: fraccId,
      residencia: residencia.toString(),
      userId: userId,
      createdAt: new Date()
    });

    residente.playerId = playerId;
    await fraccionamiento.save();

    res.json({
      success: true,
      message: "Dispositivo registrado exitosamente",
      userId: userId,
      casa: residencia
    });

  } catch (error) {
    console.error('Error en registerDevice:', error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const getDevices = async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;

    const devices = await PlayerRegistry.find({
      fraccId,
      residencia: residencia.toString()
    });

    res.json({
      casa: residencia,
      fraccionamiento: fraccId,
      totalDevices: devices.length,
      devices: devices.map(d => ({
        playerId: d.playerId,
        userId: d.userId,
        createdAt: d.createdAt
      }))
    });

  } catch (error) {
    console.error('Error en getDevices:', error);
    res.status(500).json({ error: error.message });
  }
};

const clearDevices = async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;

    const deleted = await PlayerRegistry.deleteMany({
      fraccId,
      residencia: residencia.toString()
    });

    res.json({
      mensaje: "Registros eliminados",
      eliminados: deleted.deletedCount
    });

  } catch (error) {
    console.error('Error en clearDevices:', error);
    res.status(500).json({ error: error.message });
  }
};

const auditDevices = async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;

    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }

    const casa = fraccionamiento.residencias.find(r => r.numero.toString() === residencia.toString());
    if (!casa) {
      return res.status(404).json({ error: "Casa no encontrada" });
    }

    const playersRegistrados = await PlayerRegistry.find({
      fraccId: fraccId,
      residencia: residencia.toString()
    });

    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
    const playerIdsValidos = residentesActivos.map(r => r.playerId);

    const playersFantasma = playersRegistrados.filter(p =>
      !playerIdsValidos.includes(p.playerId)
    );

    res.json({
      casa: residencia,
      residentesActivos: residentesActivos.length,
      playerIdsRegistrados: playersRegistrados.length,
      playerIdsValidos: playerIdsValidos.length,
      playerIdsFantasma: playersFantasma.length,
      detalles: {
        residentes: residentesActivos.map(r => ({
          nombre: r.nombre,
          playerId: r.playerId
        })),
        playersFantasma: playersFantasma.map(p => ({
          playerId: p.playerId,
          createdAt: p.createdAt,
          userId: p.userId
        }))
      }
    });

  } catch (error) {
    console.error('Error en auditDevices:', error);
    res.status(500).json({ error: error.message });
  }
};

const cleanPhantomDevices = async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;

    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }

    const casa = fraccionamiento.residencias.find(r => r.numero.toString() === residencia.toString());
    if (!casa) {
      return res.status(404).json({ error: "Casa no encontrada" });
    }

    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
    const playerIdsValidos = residentesActivos.map(r => r.playerId);

    const deleted = await PlayerRegistry.deleteMany({
      fraccId: fraccId,
      residencia: residencia.toString(),
      playerId: { $nin: playerIdsValidos }
    });

    res.json({
      mensaje: "Player IDs fantasma eliminados",
      eliminados: deleted.deletedCount,
      playerIdsValidos: playerIdsValidos
    });

  } catch (error) {
    console.error('Error en cleanPhantomDevices:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerDevice,
  getDevices,
  clearDevices,
  auditDevices,
  cleanPhantomDevices
};
