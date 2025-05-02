const sendNotification = async (req, res) => {
  const { title, body } = req.body;
  global.latestNotification = { title, body };
  console.log("Notificación recibida y guardada:", { title, body });
  return res.status(200).json({
    success: true,
    message: "Notificación recibida correctamente",
  });
};

module.exports = sendNotification;