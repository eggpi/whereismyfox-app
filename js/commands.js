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
    command: function command_wipe(me, args) {
      function wipeDeviceStorageTarget(target) {
        function exhaustCursorAndWipe() {
          var file = this.result;
          if (file !== null) {
            var remove = storage.delete(file.name);
            remove.onerror = function() {
              console.error("failed to remove '" + file.name + "'! " + this.error);
            }
          }

          if (!this.done) {
            this.continue();
          }
        }

        var storage = navigator.getDeviceStorage(target);
        var cursor = storage.enumerate();
        cursor.onsuccess = exhaustCursorAndWipe;
      }

      var dstargets = ["pictures", "videos", "sdcard", "music", "apps"];
      for (var i = 0; i < dstargets.length; i++) {
        if (args[dstargets[i]] === true) {
          console.log("wiping " + dstargets[i]);
          wipeDeviceStorageTarget(dstargets[i]);
        }
      }

      if (args.reset === true) {
        if (navigator.mozPower && navigator.mozPower.factoryReset) {
          navigator.mozPower.factoryReset();
        } else {
          // FIXME can this really happen?
          console.error("Something's wrong, mozPower is not available!");
        }
      }
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
