export async function updateProfile(req, res, next) {
  try {
    const { displayName = null, bio = null } = req.body || {};

    res.status(200).json({
      profile: {
        userId: req.auth.userId,
        displayName,
        bio,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}
