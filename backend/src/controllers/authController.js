import { revokeSessionById } from '../services/authService.js';

export const getAuthenticatedUserProfile = async (req, res, next) => {
  try {
    const { user } = req.auth;

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await revokeSessionById(req.auth.session.id, 'user_logout');

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
