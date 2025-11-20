const fetch = require("node-fetch");
const crypto = require("crypto");
const Reporte = require("../models/reporte.model");
const Fraccionamiento = require("../models/fraccionamiento.model");
const { crearReportePendiente, buscarReportesRecientes, marcarReporteComoExpirado } = require('../services/reporte.service');

const sendNotification = async (req, res) => {
  console.log('POST /send-notification - Inicio');
  console.log('   Body:', JSON.stringify(req.body, null, 2));

  try {
    const { title, body, fraccId, residencia, foto } = req.body;
    console.log('   title:', title);
    console.log('   body:', body);
    console.log('   fraccId:', fraccId);
    console.log('   residencia:', residencia);

    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({
        error: "Fraccionamiento no encontrado"
      });
    }

    const casa = fraccionamiento.residencias.find(c => c.numero.toString() === residencia.toString());
    if (!casa) {
      return res.status(404).json({
        error: "Casa no encontrada"
      });
    }

    if (!casa.activa) {
      return res.status(403).json({
        error: "Casa desactivada"
      });
    }

    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);

    if (residentesActivos.length === 0) {
      return res.status(400).json({
        error: "No hay Usuarios registrados en esta casa"
      });
    }

    const reportesRecientes = await buscarReportesRecientes(fraccId, residencia, title, 5);

    if (reportesRecientes.length >= 3) {
      return res.status(429).json({
        success: false,
        error: `${title} ya tiene ${reportesRecientes.length} solicitudes recientes. Por favor esperar un momento.`,
        nextAllowedTime: new Date(Date.now() + (5 * 60 * 1000)),
        currentCount: reportesRecientes.length
      });
    }

    const timestamp = Date.now();
    const visitorHash = Buffer.from(title).toString('base64').substring(0, 6);
    const notificationId = `${fraccId}_${residencia}_${visitorHash}_${timestamp}`;

    const notificationSecret = process.env.NOTIFICATION_SECRET || 'default-secret-change-in-production';
    const securityHash = crypto
      .createHmac('sha256', notificationSecret)
      .update(`${fraccId}_${residencia}_${notificationId}`)
      .digest('hex')
      .substring(0, 16);

    const playerIds = residentesActivos.map(r => r.playerId);

    const payload = {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      big_picture: foto,
      priority: 10,
      content_available: true,
      ios_sound: "default",
      android_sound: "default",
      collapse_id: notificationId,
      data: {
        notificationId,
        fraccId: fraccId.toString(),
        residencia: residencia.toString(),
        securityHash,
        foto,
        nombre: title,
        motivo: body,
        tipo: 'solicitud_acceso',
        timestamp: Date.now().toString()
      }
    };

    const response = await fetch("https://api.onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    const resultado = await response.json();
    console.log('Respuesta de OneSignal:', JSON.stringify(resultado, null, 2));

    await crearReportePendiente({
      notificationId,
      nombre: title,
      motivo: body,
      foto,
      numeroCasa: residencia,
      fraccId
    });

    const io = req.app.get('io');

    setTimeout(async () => {
      try {
        const reporteExpirado = await marcarReporteComoExpirado(notificationId);

        if (reporteExpirado && io) {
          const room = `casa_${residencia}_${fraccId}`;
          io.to(room).emit('notificacionExpirada', {
            notificationId: notificationId,
            action: 'expire_notification',
            mensaje: 'La solicitud de acceso ha expirado por falta de respuesta',
            numeroCasa: residencia.toString(),
            fraccId: fraccId.toString(),
            timestamp: new Date()
          });
        }

      } catch (error) {
        console.error('Error verificando expiración de notificación:', error);
      }
    }, 5 * 60 * 1000);

    res.json({
      success: true,
      mensaje: "Notificación enviada",
      notificationId: notificationId,
      oneSignalId: resultado.id,
      dispositivos: playerIds.length
    });

  } catch (error) {
    console.error('Error en sendNotification:', error);
    res.status(500).json({
      success: false,
      error: "Error al enviar notificación",
      details: error.message
    });
  }
};

const getPendingNotifications = async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;

    const reportesPendientes = await Reporte.find({
      fraccId: fraccId,
      numeroCasa: residencia.toString(),
      estatus: 'pendiente',
    }).sort({ tiempo: -1 });

    const notificationSecret = process.env.NOTIFICATION_SECRET || 'default-secret-change-in-production';

    const notificaciones = reportesPendientes.map(reporte => {
      const securityHash = crypto
        .createHmac('sha256', notificationSecret)
        .update(`${fraccId}_${residencia}_${reporte.notificationId}`)
        .digest('hex')
        .substring(0, 16);

      return {
        notificationId: reporte.notificationId,
        titulo: reporte.nombre,
        descripcion: reporte.motivo,
        foto: reporte.foto,
        nombre: reporte.nombre,
        motivo: reporte.motivo,
        fraccId: reporte.fraccId.toString(),
        residencia: reporte.numeroCasa,
        tipo: 'solicitud_acceso',
        fecha: reporte.tiempo,
        estatus: reporte.estatus,
        autorizadoPor: reporte.autorizadoPor,
        autorizadoPorId: reporte.autorizadoPorId,
        securityHash: securityHash,
      };
    });

    res.json({
      success: true,
      notificaciones: notificaciones,
      total: notificaciones.length
    });

  } catch (error) {
    console.error('Error en getPendingNotifications:', error);
    res.status(500).json({
      success: false,
      error: "Error al obtener notificaciones pendientes",
      details: error.message
    });
  }
};

module.exports = {
  sendNotification,
  getPendingNotifications
};
