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
      moveToNextStep,
      moveToErrorStep);
}

var loginButton = document.getElementById("persona-login");
loginButton.addEventListener("click", function() {
  window.addEventListener("message", function(event) {
    onMailVerified(event.data);
  }, false);

  var iframe = document.createElement("iframe");
  iframe.src = API_BASE_URL + "/app/persona_iframe.html";
  document.body.appendChild(iframe);
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
      moveToNextStep();
    }, moveToErrorStep, {maximumAge: 0});
});

var submitButton = document.getElementById("register-submit");
submitButton.addEventListener("click", function(event) {
  event.preventDefault();

  var pushURLInput = document.getElementById("push-url");
  if (!pushURLInput.value) {
    moveToErrorStep();
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
    moveToNextStep();
  }, moveToErrorStep);
});

var currentStep;

function moveToStep(next) {
  var current = document.getElementById("setup-step" + currentStep);

  current.classList.remove("active-step");
  next.classList.add("active-step");
}

function moveToNextStep() {
  var next = document.getElementById("setup-step" + (currentStep + 1));
  moveToStep(next);
  currentStep++;
}

function moveToErrorStep() {
  var error = document.getElementById("setup-step" + currentStep + "-error");
  moveToStep(error);
}

function beginDeviceRegistration() {
  var pushRequest = navigator.push.register();
  var pushURLInput = document.getElementById("push-url");

  pushRequest.onsuccess = function() {
    pushURLInput.value = pushRequest.result;
  }
}

function deviceRegistered(me) {
  registerCommands(me); // refresh commands on the server
  window.localStorage.setItem("me", JSON.stringify(me));
}

document.body.onload = function() {
  me = JSON.parse(window.localStorage.getItem("me"));
  if (me === null) {
    console.log("No previous registration, starting wizard!");

    currentStep = 1;
    beginDeviceRegistration();
  } else {
    console.log("Already have a registration: " + JSON.stringify(me));

    currentStep = 4;
    deviceRegistered(me);
  }

  var current = document.getElementById("setup-step" + currentStep);
  current.classList.add("active-step");
}
