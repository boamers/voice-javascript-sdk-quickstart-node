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
    config.apiSecret,
    {
      identity,
    }
  );
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

const CALLER_LABEL = "sc-client";
const CALLER_CELL_LABEL = "sc-cell";
const CALLEE_LABEL = "sc-callee";
const BASE_URL =
  "https://cf1d-2001-4c4c-152b-1700-881f-7524-65ed-bef7.ngrok-free.app";

exports.conference = async function conference(requestBody) {
  const toNumberOrClientName = requestBody.To;
  const callerId = config.callerId;

  // TODO: Should be coming (or be derived from) from the request body
  const conferenceName = "My conference";
  const shouldUseCell = false;
  const callerCellNumber = "+36709425886";

  // If the request to the /voice endpoint is TO your Twilio Number,
  // then it is an incoming call towards your Twilio.Device.
  if (toNumberOrClientName == callerId) {
    // This will connect the caller with your Twilio.Device/client
    return new VoiceResponse().dial().client(identity).toString();
  } else if (requestBody.To) {
    // This is an outgoing call

    // Add callee to conference
    const callToCallee = await callCallee();
    console.log(
      "🚀 ~ file: handler.js:113 ~ conference ~ callToCallee:",
      callToCallee.sid
    );

    // Add caller cell to conference
    if (shouldUseCell) {
      const callToCallerCell = await callCallerCell();
      console.log(
        "🚀 ~ file: handler.js:99 ~ conference ~ callToCallerCell:",
        callToCallerCell.sid
      );
    }

    // Add caller to conference
    const webClientResponse = generateWebClientResponse();
    return webClientResponse.toString();

    async function callCallee() {
      const calleeTwiml = new VoiceResponse()
        .dial({
          callerId,
          record: "record-from-answer-dual",
        })
        .conference(
          {
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
            participantLabel: CALLEE_LABEL,
            statusCallback: `${BASE_URL}/conference-status`,
            statusCallbackEvent: ["leave", "join"],
          },
          conferenceName
        );

      return client.calls.create({
        twiml: calleeTwiml.toString(),
        to: isAValidPhoneNumber(toNumberOrClientName)
          ? toNumberOrClientName
          : `client:${toNumberOrClientName}`,
        from: callerId,
        statusCallback: `${BASE_URL}/status`,
        statusCallbackEvent: ["initiated", "completed"],
      });
    }

    async function callCallerCell() {
      const cellTwiml = new VoiceResponse()
        .dial({
          callerId,
        })
        .conference(
          {
            startConferenceOnEnter: false,
            endConferenceOnExit: true,
            participantLabel: CALLER_CELL_LABEL,
            // statusCallback: `${BASE_URL}/conference-status`,
            // statusCallbackEvent: ["leave", "join"],
          },
          conferenceName
        );

      return client.calls.create({
        twiml: cellTwiml.toString(),
        to: callerCellNumber,
        from: callerId,
      });
    }

    function generateWebClientResponse() {
      return new VoiceResponse()
        .dial({
          callerId,
        })
        .conference(
          {
            startConferenceOnEnter: false,
            endConferenceOnExit: true,
            participantLabel: CALLER_LABEL,
            statusCallback: `${BASE_URL}/conference-status?calleeCallSid=${callToCallee.sid}`,
            statusCallbackEvent: ["leave", "join"],
          },
          conferenceName
        );
    }
  } else {
    return new VoiceResponse().say("Thanks for calling!").toString();
  }
};

exports.conferenceStatus = async function conferenceStatus(requestBody, query) {
  const { StatusCallbackEvent, ParticipantLabel, FriendlyName, ConferenceSid } =
    requestBody;
  const { calleeCallSid } = query;

  if (
    StatusCallbackEvent === "participant-join" &&
    ParticipantLabel === CALLEE_LABEL
  ) {
    console.log(
      `${ParticipantLabel} has entered the conference: ${FriendlyName} (${ConferenceSid})`
    );
    // Fetch sc-client participant from the conference
    const webClientParticipant = await client
      .conferences(ConferenceSid)
      .participants(CALLER_LABEL)
      .fetch();
    if (!webClientParticipant) {
      throw new Error("sc-client participant not found in conference");
    }
    console.log(
      "🚀 ~ file: handler.js:199 ~ conferenceStatus ~ webClientParticipant:",
      webClientParticipant.callSid
    );
    const sentMessage = await client
      .calls(webClientParticipant.callSid)
      .userDefinedMessages.create({
        content: JSON.stringify({
          message: "CALLEE_JOINED",
        }),
      });
    console.log(
      "🚀 ~ file: handler.js:190 ~ sentMessage ~ sentMessage:",
      sentMessage
    );
  }

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
