
const axios = require("axios");

const fracc = await Fraccionamiento.findById(fraccId);
const casa = fracc.residencias.find(r => r.numero === parseInt(residencia)); 

if (casa) {
  await axios.post("https://ingresosbackend.onrender.com/api/notifications/send-notification", {
    title: "Visita registrada",
    body: `Visita para la casa ${residencia}: ${nombre} vino por ${motivo}`,
    dep: residencia 
  });
}