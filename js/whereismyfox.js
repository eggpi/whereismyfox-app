var me = null;

var API_BASE_URL = "http://whereismyfox.com";
function makeXHR(url, method, onsuccess, onerror) {
  var xhr = new XMLHttpRequest({mozSystem: true});
  xhr.open(method, url);

  // use session cookie if we have one
  var session = window.localStorage.getItem("session-cookie");
  if (session) {
    xhr.setRequestHeader("Cookie", session);
  }

  xhr.setRequestHeader("Connection", "close");
  xhr.onload = function() {
    if (xhr.status == 200) {
      var session = xhr.getResponseHeader("Set-Cookie");
      if (session) {
        window.localStorage.setItem("session-cookie", session);
      }

      if (onsuccess) {
        onsuccess(xhr.responseText);
      }

      return;
    }

    if (onerror) {
      onerror();
    }
  };

  xhr.onerror = onerror;
  return xhr;
}

function doGET(url, onsuccess, onerror) {
  var xhr = makeXHR(url, "GET", onsuccess, onerror);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.send(null);
}

function doPUT(url, obj, onsuccess, onerror) {
  var payload = JSON.stringify(obj);

  var xhr = makeXHR(url, "PUT", onsuccess, onerror);
  xhr.setRequestHeader("Content-length", payload.length);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  xhr.setRequestHeader("Accept", "application/json");
  xhr.send(payload);
}

function doPOST(url, form, onsuccess, onerror) {
  var xhr = makeXHR(url, "POST", onsuccess, onerror);

  var param = [];
  for (var key in form) {
    param.push(key + "=" + form[key]);
  }

  param = param.join("&");

  xhr.setRequestHeader("Content-length", param.length);
  xhr.setRequestHeader("Content-type",
                       "application/x-www-form-urlencoded; charset=UTF-8");
  xhr.send(param);
}

function onMailVerified(assertion) {
  console.log(assertion);
  doPOST(API_BASE_URL + "/auth/applogin",
      {assertion: assertion},
      moveToNextStep.bind(null, STEP_LOGIN),
      moveToErrorStep.bind(null, STEP_LOGIN));
}

var loginButton = document.getElementById("persona-login");
loginButton.addEventListener("click", function() {
  var personaIframe = document.getElementById("persona-iframe");
  personaIframe.postMessage("start");
});

navigator.mozSetMessageHandler("push", function(message) {
  console.log("Got push notification!");

  doGET(API_BASE_URL + "/device/invocation/" + message.version,
        function(invocation) {
          console.log("Got this invocation " + invocation);
          runCommand(JSON.parse(invocation), me);
        }, function() {
          console.error("Failed to fetch invocation");
        });
});

var geoConfigButton = document.getElementById("begin-geo-config");
geoConfigButton.addEventListener("click", function() {
  navigator.geolocation.getCurrentPosition(
    function(position) {
      console.log(position.coords.latitude);
      moveToNextStep(STEP_GEOLOCATION);
    }, moveToErrorStep.bind(
        null,
        STEP_GEOLOCATION,
        "You may want to move somewhere else if you're indoors.")
    , {maximumAge: 0});
});

var submitButton = document.getElementById("register-submit");
submitButton.addEventListener("click", function(event) {
  event.preventDefault();

  var pushURLInput = document.getElementById("push-url");
  if (!pushURLInput.value) {
    moveToErrorStep(STEP_REGISTRATION, "Looks like a problem on our end.");
    return;
  }

  var obj = {};
  var fields = this.form.getElementsByTagName("input");
  for (var i = 0; i < fields.length; i++) {
    obj[fields[i].name] = fields[i].value;
  }

  doPUT(API_BASE_URL + "/device/", obj, function(response) {
    me = JSON.parse(response);
    deviceRegistered(me);
  }, function() {
    moveToErrorStep(STEP_REGISTRATION, "Our server doesn't seem to like you :(");
  });
});

var startOverButton = document.getElementById("start-over");
startOverButton.addEventListener("click", beginDeviceRegistration);

var currentStep;

// registration steps, in order
const STEP_ERROR = 0,
      STEP_LOGIN = 1,
      STEP_GEOLOCATION = 2,
      STEP_REGISTRATION = 3,
      STEP_DONE = 4;
      STEP_INITIAL = 1;

function moveToStepElement(stepElement) {
  var currentElement = document.getElementById("setup-step" + currentStep);
  if (currentElement) {
    currentElement.classList.remove("active-step");
  }

  stepElement.classList.add("active-step");
}

function moveToSetupStep(step) {
  var nextElement = document.getElementById("setup-step" + step);
  moveToStepElement(nextElement);
  currentStep = step;
}

function moveToNextStep(from) {
  if (currentStep != from) {
    console.log("step " + currentStep + " != " + from + ", not moving.");
    return;
  }

  moveToSetupStep(currentStep + 1);
}

function moveToErrorStep(from, message) {
  var messageElement = document.getElementById("error-message");
  messageElement.textContent = message ? message : "";

  moveToSetupStep(0);
}

function beginDeviceRegistration() {
  var pushRequest = navigator.push.register();
  var pushURLInput = document.getElementById("push-url");

  pushRequest.onsuccess = function() {
    pushURLInput.value = pushRequest.result;
  }

  moveToSetupStep(STEP_INITIAL);
}

function deviceRegistered(me) {
  registerCommands(me); // refresh commands on the server
  window.localStorage.setItem("me", JSON.stringify(me));

  moveToSetupStep(STEP_DONE);
}

document.body.onload = function() {
  // create Persona iframe and setup message handler
  var iframe = document.createElement("iframe");
  iframe.id = "persona.iframe";
  iframe.src = API_BASE_URL + "/static/persona_iframe.html";
  document.body.appendChild(iframe);

  window.addEventListener("message", function(event) {
    onMailVerified(event.data);
  }, false);

  me = JSON.parse(window.localStorage.getItem("me"));
  if (me === null) {
    console.log("No previous registration, starting wizard!");
    beginDeviceRegistration();
  } else {
    console.log("Already have a registration: " + JSON.stringify(me));
    deviceRegistered(me);
  }
}
