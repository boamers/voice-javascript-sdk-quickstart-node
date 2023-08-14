const Router = require("express").Router;
const { tokenGenerator, voiceResponse } = require("./handler");

const router = new Router();

router.get("/token", (req, res) => {
  const token = tokenGenerator();
  console.log("🚀 ~ file: router.js:8 ~ router.get ~ token:", token);
  res.send(token);
});

router.post("/voice", (req, res) => {
  res.set("Content-Type", "text/xml");

  const response = voiceResponse(req.body);
  console.log("🚀 ~ file: router.js:14 ~ router.post ~ response:", response);

  res.send(response);
});

module.exports = router;
