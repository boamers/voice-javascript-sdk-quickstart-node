const Router = require("express").Router;
const { tokenGenerator, voiceResponse } = require("./handler");

const router = new Router();

router.get("/token", (req, res) => {
  res.send(tokenGenerator());
});

router.post("/voice", (req, res) => {
  res.set("Content-Type", "text/xml");

  const response = voiceResponse(req.body);
  console.log("🚀 ~ file: router.js:14 ~ router.post ~ response:", response);

  res.send(response);
});

module.exports = router;
