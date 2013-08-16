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
      // TODO accept arguments for what to wipe

      function exhaustCursorAndWipe() {
        var file = this.result;
        console.log(file.name);

        var remove = pictures.delete(file.name);
        remove.onsuccess = function() {
          console.log("successfully removed!");
        }

        remove.onerror = function() {
          console.error("failed to remove! " + this.error);
        }

        if (!this.done) {
          this.continue();
        }
      }

      var pictures = navigator.getDeviceStorage("pictures");
      var cursor = pictures.enumerate();
      cursor.onsuccess = exhaustCursorAndWipe;
    }
  }
];

function registerCommands(me, onsuccess, onerror) {
  var cmdids = commands.map(function(command) {
    return command.id;
  });

  var url = API_BASE_URL + "/device/" + me.Id + "/command";

  console.log("sending commands " + JSON.stringify(cmdids) + " to " + url);
  doPUT(url, cmdids, onsuccess, onerror);
}

function runCommand(invocation, me) {
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
