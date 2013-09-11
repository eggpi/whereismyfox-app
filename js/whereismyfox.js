var me = null;

var API_BASE_URL = "http://localhost:8080";
function doHTTPReqwest(options) {
  if (!options.headers) {
    options.headers = {};
  }

  // use session cookie if we have one
  var session = window.localStorage.getItem("session-cookie");
  if (session) {
    options.headers["Cookie"] = session;
  }

  options.headers["Connection"] = "close";
  options.params = {mozSystem: true};

  var onsuccess = options.success;
  options.success = successHandler;

  var request = reqwest(options);
  function successHandler(response) {
    var xhr = request.request;
    var session = xhr.getResponseHeader("Set-Cookie");
    if (session) {
      window.localStorage.setItem("session-cookie", session);
    }

    if (onsuccess) {
      onsuccess(response);
    }
  }
}

function onMailVerified(assertion) {
  console.log(assertion);

  doHTTPReqwest({
    url: API_BASE_URL + "/auth/applogin",
    method: "POST",
    data: {assertion: assertion},
    contentType: "application/x-www-form-urlencoded; charset=UTF-8",
    type: "json",
    success: moveToNextStep,
    error: function() {
      moveToErrorStep("Persona failed to verify!");
    }
  });
}

var loginButton = document.getElementById("persona-login");
loginButton.addEventListener("click", function() {
  window.addEventListener("message", function(event) {
    onMailVerified(event.data);
  }, false);

  var iframe = document.createElement("iframe");
  iframe.src = API_BASE_URL + "/static/persona_iframe.html";
  document.body.appendChild(iframe);
});

navigator.mozSetMessageHandler("push", function(message) {
  console.log("Got push notification!");

  doHTTPReqwest({
    url: API_BASE_URL + "/device/invocation/" + message.version,
    method: "GET",
    success: function(invocation) {
      console.log("Got this invocation " + JSON.stringify(invocation));
      runCommand(invocation, me);
    },
    error: function() {
      console.error("Failed to fetch invocation");
    },
    type: "json"
  });
});

var geoConfigButton = document.getElementById("begin-geo-config");
geoConfigButton.addEventListener("click", function() {
  navigator.geolocation.getCurrentPosition(
    function(position) {
      console.log(position.coords.latitude);
      moveToNextStep();
    }, function() {
      moveToErrorStep("You may want to move somewhere else if you're indoors.");
    }, {maximumAge: 0});
});

var submitButton = document.getElementById("register-submit");
submitButton.addEventListener("click", function(event) {
  event.preventDefault();

  var pushURLInput = document.getElementById("push-url");
  if (!pushURLInput.value) {
    moveToErrorStep("Looks like a problem on our end.");
    return;
  }

  var obj = {};
  var fields = this.form.getElementsByTagName("input");
  for (var i = 0; i < fields.length; i++) {
    obj[fields[i].name] = fields[i].value;
  }

  doHTTPReqwest({
    url: API_BASE_URL + "/device/",
    method: "PUT",
    data: JSON.stringify(obj),
    contentType: "application/json",
    headers: {
      "Accept": "application/json"
    },
    type: "json",
    success: function(response) {
      me = response;
      deviceRegistered(me);
    },
    error: function() {
      moveToErrorStep("Our server doesn't seem to like you :(");
    }
  });
});

var startOverButton = document.getElementById("start-over");
startOverButton.addEventListener("click", beginDeviceRegistration);

var currentStep;

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

function moveToNextStep() {
  moveToSetupStep(currentStep + 1);
}

function moveToErrorStep(message) {
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

  moveToSetupStep(1);
}

function deviceRegistered(me) {
  // refresh commands on the server
  registerCommands(me, function() {
    window.localStorage.setItem("me", JSON.stringify(me));
    moveToSetupStep(4);
  }, function() {
    moveToErrorStep(
      "Huh, our server is acting strangely. Hopefully it's temporary.");
  });
}

document.body.onload = function() {
  me = JSON.parse(window.localStorage.getItem("me"));
  if (me === null) {
    console.log("No previous registration, starting wizard!");
    beginDeviceRegistration();
  } else {
    console.log("Already have a registration: " + JSON.stringify(me));
    deviceRegistered(me);
  }
}
