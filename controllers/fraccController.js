const FraccUser = require("../models/fraccUserModels");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

exports.addFraccUser = async (req, res) => {
  const { usuario, contraseña, fraccionamiento } = req.body;

  try {
    const nuevoUsuario = new FraccUser({
      usuario,
      contraseña,
      fraccionamiento,
    });

    await nuevoUsuario.save();

    const qrId = fraccionamiento.qrVisitas;

    const link = `https://ingresos-drab.vercel.app/Visitas?id=${qrId}`;

    const qrImage = await QRCode.toDataURL(link);

    res.status(201).json({
      message: "Usuario creado con éxito",
      data: nuevoUsuario,
      qr: {
        link,
        imagenBase64: qrImage,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear fraccionamiento",
      error: error.message,
    });
  }
};

exports.loginFraccUser = async (req, res) => {
  const { usuario, contraseña } = req.body;

  try {
    const user = await FraccUser.findOne({ usuario });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(contraseña, user.contraseña);
    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    res.status(200).json({
      message: "Login exitoso",
      user: {
        id: user._id,
        fraccionamiento: user.fraccionamiento,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error en el servidor",
      error: error.message,
    });
  }
};

exports.updateFraccUser = async (req, res) => {
  const { id } = req.params; 
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

    const fraccActualizado = await FraccUser.findByIdAndUpdate(
      id,
      nuevosDatos,
      { new: true }
    );

    if (!fraccActualizado) {
      return res.status(404).json({ message: "Fraccionamiento no encontrado" });
    }

    const qrId = fraccActualizado.fraccionamiento.qrVisitas;
    const link = `https://ingresos-drab.vercel.app/Visitas?id=${qrId}`;
    const qrImage = await QRCode.toDataURL(link);

    res.status(200).json({
      message: "Fraccionamiento actualizado con éxito",
      data: fraccActualizado,
      qr: {
        link,
        imagenBase64: qrImage,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar fraccionamiento",
      error: error.message,
    });
  }
};
