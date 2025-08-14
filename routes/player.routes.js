const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const Fraccionamiento = require("../models/fraccionamiento");
const Notificacion = require("../models/Notification");
const PlayerRegistry = require("../models/PlayerRegistry");

router.post("/register", async (req, res) => {
  const { playerId, fraccId, residencia, userId } = req.body;
  
  try {
    if (userId) {
      const existingUser = await PlayerRegistry.findOne({ 
        playerId, 
        fraccId, 
        residencia,
        userId 
      });
      
      if (existingUser) {
        existingUser.createdAt = new Date();
        await existingUser.save();
        return res.json({ success: true, message: 'Usuario actualizado' });
      }
      
      const newPlayer = new PlayerRegistry({ 
        playerId, 
        fraccId, 
        residencia, 
        userId,
        createdAt: new Date()
      });
      
      await newPlayer.save();
      console.log(`📱 Nuevo usuario registrado: ${userId} en casa ${residencia}`);
      return res.json({ success: true, message: 'Usuario registrado exitosamente' });
    }
    
    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    const casa = fracc.residencias.find(c => c.numero === parseInt(residencia));
    if (!casa) return res.status(404).json({ error: "Casa no encontrada" });

    const residentesActivos = casa.residentes.filter(r => r.activo);
    if (!residentesActivos.length) return res.status(404).json({ error: "No hay residentes activos" });

    residentesActivos.forEach(r => {
      r.playerId = playerId;
    });
    await fracc.save();

    res.status(201).json({ success: true, message: "Player registrado correctamente (legacy)" });
    
  } catch (error) {
    console.error('❌ Error registrando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;