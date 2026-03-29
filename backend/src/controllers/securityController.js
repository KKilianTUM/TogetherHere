export function getCsrfToken(req, res) {
  res.status(200).json({ csrfToken: res.locals.csrfToken });
}
