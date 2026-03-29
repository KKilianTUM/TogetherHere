export async function createActivity(req, res, next) {
  try {
    const { title = 'Untitled Activity' } = req.body || {};

    res.status(201).json({
      activity: {
        id: 'activity-demo-1',
        title,
        createdBy: req.auth.userId
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function joinActivity(req, res, next) {
  try {
    res.status(200).json({
      join: {
        activityId: req.params.activityId,
        userId: req.auth.userId,
        status: 'joined'
      }
    });
  } catch (error) {
    next(error);
  }
}
