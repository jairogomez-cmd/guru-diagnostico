module.exports = async function handler(req, res) {
  res.setHeader('Set-Cookie', 'guru_dash_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true }));
};
