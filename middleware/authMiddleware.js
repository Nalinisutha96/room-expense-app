const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ msg: "No token" });
    }

    const verified = jwt.verify(token, "secret");

    // 🔥 IMPORTANT FIX
    req.user = {
      id: verified.id,
      role: verified.role,
    };

    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};