// const router = require("express").Router();
// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// // REGISTER
// router.post("/register", async (req, res) => {
//   try {
//     const hash = await bcrypt.hash(req.body.password, 10);
//     const user = await User.create({
//       ...req.body,
//       password: hash,
//     });
//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ msg: "Error registering user" });
//   }
// });

// // LOGIN
// router.post("/login", async (req, res) => {
//   try {
//     const user = await User.findOne({ email: req.body.email });
//     if (!user) return res.status(404).json({ msg: "User not found" });
//     const valid = await bcrypt.compare(req.body.password, user.password);
//     if (!valid) return res.status(401).json({ msg: "Wrong password" });
//     const token = jwt.sign({ id: user._id, role: user.role }, "secret");
//     res.json({ token, user });
//   } catch (err) {
//     res.status(500).json({ msg: "Error logging in" });
//   }
// });

// module.exports = router;

//   if (!user) return res.json({ msg: "User not found" });

//   const valid = await bcrypt.compare(req.body.password, user.password);

//   if (!valid) return res.json({ msg: "Wrong password" });

//   const token = jwt.sign(
//     { id: user._id, role: user.role },
//     "secret"
//   );

//   res.json({ token, user });
// });

// module.exports = router;

const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);

    const user = await User.create({
      ...req.body,
      password: hash,
    });

    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Register error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) return res.json({ msg: "User not found" });

    const valid = await bcrypt.compare(req.body.password, user.password);

    if (!valid) return res.json({ msg: "Wrong password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      "secret"
    );

    res.json({ token, user });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Login error" });
  }
});

module.exports = router;