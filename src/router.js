const Router = require("express").Router;
const {
  tokenGenerator,
  voiceResponse,
  disclaimerResponse,
} = require("./handler");

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

router.get("/disclaimer", (req, res) => {
  const response = disclaimerResponse(req.body);
  console.log("🚀 ~ file: router.js:21 ~ router.get ~ response:", response);
  res.set("Content-Type", "text/xml");
  res.send(response);
});

router.post("/status", (req, res) => {
  console.log("🚀 ~ file: router.js:31 ~ router.post ~ req.body:", req.body);
  res.sendStatus(200);
});

module.exports = router;
