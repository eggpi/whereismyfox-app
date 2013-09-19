const commands = [
  {
    id: 0,
    command: function command_start_tracking(me) {
      if (me.watchId !== null && me.watchId !== undefined) {
        return;
      }

      me.watchId = navigator.geolocation.watchPosition(
        function(position) {
          console.log(
            "Updating location to (" +
            position.coords.latitude + ", " +
            position.coords.longitude + ")"
            );

          doPOST(
            API_BASE_URL + "/device/location/" + me.Id,
            {
              "latitude": position.coords.latitude,
              "longitude": position.coords.longitude
            }, null, null);
        }
      );
    }
  },

  {
    id: 1,
    command: function command_stop_tracking(me) {
      if (me.watchId === null) {
        return;
      }

      navigator.geolocation.clearWatch(me.watchId);
      me.watchId = null;
    }
  },

  {
    id: 2,
    command: function command_wipe(me) {
      if (navigator.mozPower && navigator.mozPower.factoryReset) {
        navigator.mozPower.factoryReset();
      } else {
        // FIXME can this really happen?
        console.error("Something's wrong, mozPower is not available!");
      }
    }
  }
];

const SMSCommandNamesToIds = {
  "wipe": 2
};

function generateSMSCommandCode() {
  return "" + Math.round(Math.random() * 1e8);
}

function invocationFromSms(tokens) {
  var cmdid = SMSCommandNamesToIds[tokens[0]];
  if (cmdid !== undefined) {
    return {"CommandId": cmdid, "Arguments": tokens.splice(1, 1)};
  }

  return null;
}

function setupSMSCommandListener() {
  var messageManager = window.navigator.mozMobileMessage;
  messageManager.addEventListener("received", function(e) {
    var message = e.message;
    var tokens = message.split(" ");
    if (tokens[0] === me.SMSCommandCode) {
       var invocation = invocationFromSms(tokens.splice(1, 1));
       if (invocation !== null) runCommand(invocation);

       // TODO do we want to remove the message?
    }
  });
}

function registerCommands(me, onsuccess, onerror) {
  var cmdids = commands.map(function(command) {
    return command.id;
  });

  var url = API_BASE_URL + "/device/" + me.Id + "/command";

  console.log("sending commands " + JSON.stringify(cmdids) + " to " + url);
  doPUT(url, cmdids, onsuccess, onerror);
}

function runCommand(invocation) {
  var command = null;

  for (var i = 0; i < commands.length; i++) {
    if (commands[i].id == invocation.CommandId) {
      command = commands[i];
      break;
    }
  }

  if (command == null) {
    console.error("Failed to find command for id " + invocation.CommandId);
    return
  }

  command.command(me, invocation.Arguments);
}
