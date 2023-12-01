const VoiceResponse = require("twilio").twiml.VoiceResponse;
const AccessToken = require("twilio").jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const nameGenerator = require("../name_generator");
const config = require("../config");

const client = require("twilio")(config.accountSid, config.authToken);

var identity;

exports.tokenGenerator = function tokenGenerator() {
  identity = nameGenerator();

  const accessToken = new AccessToken(
    config.accountSid,
    config.apiKey,
    config.apiSecret
  );
  accessToken.identity = identity;
  const grant = new VoiceGrant({
    outgoingApplicationSid: config.twimlAppSid,
    incomingAllow: true,
  });
  accessToken.addGrant(grant);

  // Include identity and token in a JSON response
  return {
    identity: identity,
    token: accessToken.toJwt(),
  };
};

exports.voiceResponse = function voiceResponse(requestBody) {
  const toNumberOrClientName = requestBody.To;
  const callerId = config.callerId;
  let twiml = new VoiceResponse();

  // If the request to the /voice endpoint is TO your Twilio Number,
  // then it is an incoming call towards your Twilio.Device.
  if (toNumberOrClientName == callerId) {
    let dial = twiml.dial();

    // This will connect the caller with your Twilio.Device/client
    dial.client(identity);
  } else if (requestBody.To) {
    // This is an outgoing call

    // set the callerId
    let dial = twiml.dial({ callerId });

    // Check if the 'To' parameter is a Phone Number or Client Name
    // in order to use the appropriate TwiML noun
    const attr = isAValidPhoneNumber(toNumberOrClientName)
      ? "number"
      : "client";
    dial[attr]({}, toNumberOrClientName);
  } else {
    twiml.say("Thanks for calling!");
  }

  return twiml.toString();
};

exports.conference = async function conference(requestBody) {
  const toNumberOrClientName = requestBody.To;
  const callerId = config.callerId;
  let webClientResponse = new VoiceResponse();
  let cellResponse = new VoiceResponse();
  let calleeResponse = new VoiceResponse();

  // If the request to the /voice endpoint is TO your Twilio Number,
  // then it is an incoming call towards your Twilio.Device.
  if (toNumberOrClientName == callerId) {
    let dial = webClientResponse.dial();

    // This will connect the caller with your Twilio.Device/client
    dial.client(identity);
  } else if (requestBody.To) {
    // This is an outgoing call

    const CONF_FRIENDLY_NAME = "My conference";

    // cellTwiml = cellResponse.dial().conference(CONF_FRIENDLY_NAME, {
    //   startConferenceOnEnter: false,
    //   endConferenceOnExit: true,
    //   participantLabel: "sc-cell",
    // });

    calleeTwiml = calleeResponse
      .dial({
        record: "record-from-answer-dual",
      })
      .conference(CONF_FRIENDLY_NAME, {
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        participantLabel: "sc-callee",
        statusCallback:
          "https://d64b-89-132-79-78.ngrok-free.app/conference-status",
        statusCallbackEvent: ["leave", "join"],
      });

    // Add cell phone to conference
    // client.calls
    //   .create({
    //     twiml: cellTwiml.toString(),
    //     to: "+36709425886",
    //     from: "+14086135720",
    //   })
    //   .then((call) => console.log(call.sid));

    // Add callee to conference
    const call = await client.calls.create({
      twiml: calleeTwiml.toString(),
      to: isAValidPhoneNumber(toNumberOrClientName)
        ? toNumberOrClientName
        : `client:${toNumberOrClientName}`,
      from: "+14086135720",
      statusCallback: "https://d64b-89-132-79-78.ngrok-free.app/status",
      statusCallbackEvent: ["initiated", "completed"],
    });
    console.log(call.sid);

    let dial = webClientResponse.dial();
    dial.conference(CONF_FRIENDLY_NAME, {
      startConferenceOnEnter: false,
      endConferenceOnExit: true,
      participantLabel: "sc-client",
      statusCallback: `https://d64b-89-132-79-78.ngrok-free.app/conference-status?calleeCallSid=${call.sid}`,
      statusCallbackEvent: ["leave", "join"],
    });

    return webClientResponse.toString();
  } else {
    webClientResponse.say("Thanks for calling!");
  }

  return webClientResponse.toString();
};

exports.conferenceStatus = function conferenceStatus(requestBody, query) {
  const { StatusCallbackEvent } = requestBody;
  const { calleeCallSid } = query;

  // Lucky for us if anyone leaves the conference, we can just hangup the call
  if (StatusCallbackEvent === "participant-leave") {
    client
      .calls(calleeCallSid)
      .update({
        status: "completed",
      })
      .then(() => {
        console.log(`${calleeCallSid} hangup`);
      })
      .catch(() => {
        console.log(`${calleeCallSid} hangup failed`);
      });
  }
};

/**
 * Checks if the given value is valid as phone number
 * @param {Number|String} number
 * @return {Boolean}
 */
function isAValidPhoneNumber(number) {
  return /^[\d\+\-\(\) ]+$/.test(number);
}
