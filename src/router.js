const Router = require("express").Router;
const {
  tokenGenerator,
  voiceResponse,
  conference,
  conferenceStatus,
} = require("./handler");

const router = new Router();

router.get("/token", (req, res) => {
  const response = tokenGenerator();
  console.log("/token", response);
  res.send(response);
});

router.post("/voice", (req, res) => {
  const response = voiceResponse(req.body);
  console.log("voice", response);
  res.set("Content-Type", "text/xml");
  res.send(response);
});

router.post("/conference", (req, res) => {
  conference(req.body)
    .then((response) => {
      console.log("/conference", response);
      res.set("Content-Type", "text/xml");
      return res.send(response);
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).end();
    });
});

router.post("/status", (req, res) => {
  console.log("/status", req.body, req.query);
  res.status(200).end();
});

router.post("/conference-status", (req, res) => {
  console.log("/conference-status", req.body);
  conferenceStatus(req.body, req.query)
    .then(() => {
      res.status(200).end();
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).end();
    });
});

module.exports = router;
