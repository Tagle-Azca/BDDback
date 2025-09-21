const UserToken = require('../models/userToken');
const Fraccionamiento = require('../models/fraccionamiento');
const crypto = require('crypto');

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function validateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const token = authHeader.substring(7);
    const userToken = await UserToken.findOne({
      token,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!userToken) {
      return res.status(401).json({
        error: 'Token inválido o expirado',
        shouldRelogin: true
      });
    }

    const threeDaysBeforeExpiry = new Date(userToken.expiresAt.getTime() - (3 * 24 * 60 * 60 * 1000));
    const needsValidation = new Date() > threeDaysBeforeExpiry;

    if (needsValidation) {
      const isStillValid = await validateUserStillExists(userToken);
      if (!isStillValid) {
        await UserToken.updateOne(
          { _id: userToken._id },
          { isActive: false }
        );
        return res.status(401).json({
          error: 'Usuario eliminado por administrador',
          shouldRelogin: true
        });
      }

      await UserToken.updateOne(
        { _id: userToken._id },
        {
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastValidated: new Date()
        }
      );
    }

    req.user = {
      userId: userToken.userId,
      fraccId: userToken.fraccId,
      residencia: userToken.residencia,
      playerId: userToken.playerId
    };

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function validateUserStillExists(userToken) {
  try {
    const fraccionamiento = await Fraccionamiento.findById(userToken.fraccId);
    if (!fraccionamiento) return false;

    const casa = fraccionamiento.residencias.find(r =>
      r.numero.toString() === userToken.residencia.toString()
    );
    if (!casa || !casa.activa) return false;

    const residente = casa.residentes.find(r =>
      r._id.toString() === userToken.userId && r.activo === true
    );

    return !!residente;
  } catch (error) {
    return false;
  }
}

async function createUserToken(userId, fraccId, residencia, playerId = null) {
  try {
    await UserToken.updateMany(
      { userId, fraccId, residencia },
      { isActive: false }
    );

    const token = generateSecureToken();
    const userToken = await UserToken.create({
      userId,
      fraccId,
      residencia,
      token,
      playerId
    });

    return {
      token: userToken.token,
      expiresAt: userToken.expiresAt
    };
  } catch (error) {
    throw error;
  }
}

async function invalidateToken(token) {
  try {
    await UserToken.updateOne(
      { token },
      { isActive: false }
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function invalidateUserTokens(userId, fraccId, residencia) {
  try {
    const result = await UserToken.updateMany(
      { userId, fraccId, residencia },
      { isActive: false }
    );
    return result.modifiedCount;
  } catch (error) {
    return 0;
  }
}

module.exports = {
  validateToken,
  createUserToken,
  invalidateToken,
  invalidateUserTokens,
  validateUserStillExists
};