const Router = require("express").Router;
const { tokenGenerator, voiceResponse } = require("./handler");

const router = new Router();

router.get("/token", (req, res) => {
  const response = tokenGenerator();
  console.log("🚀 ~ file: router.js:8 ~ router.get ~ response:", response);
  res.send(response);
});

router.post("/voice", (req, res) => {
  const response = voiceResponse(req.body);
  console.log("🚀 ~ file: router.js:12 ~ router.post ~ response:", response);
  res.set("Content-Type", "text/xml");
  res.send(response);
});

module.exports = router;
