const ok = (res, data = null, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, message, data });

const created = (res, data, message = 'Created') => ok(res, data, message, 201);

module.exports = { ok, created };
