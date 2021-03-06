/*
  These functions are called on system initilization if need be.
  There are functions to:
    -copy over the murata firmware to the correct location
    -start the wifi access point
    -create a swap file and make sure it persists for future sessions

  All functions are promised based so they can be chained synchronously if necessary.
  The swap creation functions are the only ones at the moment that *need* to be synchronously
  chained.
*/

var Q, exec;

module.exports = {
  sysInitSetup : function(_q, _exec){
    Q = _q;
    exec = _exec;
  },

  touchDpkg : function(){
    var deferred = Q.defer();
    exec("touch /var/lib/dpkg/status", function(error, stdout, stderr){
      if(error instanceof Error){
        console.log("Error: "+error);
        deferred.reject(error);
      }else{
        console.log("Success! dpkg status created");
        deferred.resolve(version);
      }
    });
    return deferred.promise;
  },

  getLibgphotoVersion : function(){
    var deferred = Q.defer();
    exec("dpkg-deb -I /home/root/pulse-nodejs/lib/libgphoto-debian.deb | grep Version", function(error, stdout, stderr){
      if(error instanceof Error){
        console.log("Error: "+error);
        deferred.reject(error);
      }else{
        var version = stdout.split(' ')[2].split('.');
        console.log("Success! "+stdout.split(' ')[2]);
        deferred.resolve(version);
      }
    });
    return deferred.promise;
  },

  getInstalledLibgphotoVersion : function(){

    var deferred = Q.defer();
    exec("dpkg -l | grep libgphoto2 | awk '{print $3}'", function(error, stdout, stderr){
      if(error instanceof Error){
        console.log("Error: "+error);
        deferred.reject(error);
      }else{
        var version = stdout.split('.');
        console.log("Success! " + stdout);
        deferred.resolve(version);
      }
    });
    return deferred.promise;
  },

  installLibgphoto : function(){
    var deferred = Q.defer();
    exec("dpkg -i /home/root/pulse-nodejs/lib/libgphoto-debian.deb", function(error, stdout, stderr){
      if(error instanceof Error){
        console.log("Error: "+error);
        deferred.reject(error);
      }else{
        console.log("Success! " + stdout);
        deferred.resolve(stdout);
      }
    });
    return deferred.promise;
  },

  startWifiAP : function(){
    console.log("Running wifi AP init");
    var deferred = Q.defer();
    exec(". /home/root/pulse-nodejs/utils/wifiGo.sh", function(error, stdout, stderr){
      if(error instanceof Error){
        console.log("Error: "+error);
        deferred.reject(error);
      }else{
        console.log("Success!");
        deferred.resolve(stdout);
      }
    });
    return deferred.promise;
  },

  copyMurataFirmware : function(){
    console.log("Copying Murata firmware");
    var deferred = Q.defer();
    exec("cp /home/root/pulse-nodejs/lib/fw_bcmdhd.bin /lib/firmware/bcm/", function(error, stdout, stderr){
      if(error instanceof Error){
        console.log("Error: "+error);
        deferred.reject(error);
      }else{
        console.log("Success!");
        deferred.resolve(stdout);
      }
    });
    return deferred.promise;
  },

  copyMurataSDRAM : function(){
    console.log("Copying Murata SDRAM");
    var deferred = Q.defer();
    exec("cp /home/root/pulse-nodejs/lib/bcmdhd.cal /lib/firmware/bcm/", function(error, stdout, stderr){
      if(error instanceof Error){
        console.log("Error: "+error);
        deferred.reject(error);
      }else{
        console.log("Success!");
        deferred.resolve(stdout);
      }
    });
    return deferred.promise;
  },

  //swap is our own little chunk of memory that we use for paging data
  swapInit : function(){
    var createSwap = function(){
      console.log("Creating Swap...");
      var deferred = Q.defer();
      exec("dd if=/dev/zero of=/swap bs=1M count=128", function(error, stdout, stderr){
        if(error instanceof Error){
          console.log("Error creating swap: "+error);
          deferred.reject(error);
        }else{
          console.log("Success creating swap");
          deferred.resolve(stdout);
        }
      });
      return deferred.promise;
    };

    var makeSwap = function(){
      console.log("Converting file to swap..");
      var deferred = Q.defer();
      exec("mkswap /swap", function(error, stdout, stderr){
        if(error instanceof Error){
          console.log("Error converting swap: "+error);
          deferred.reject(error);
        }else{
          console.log("Success converting swap");
          deferred.resolve(stdout);
        }
      });
      return deferred.promise;
    };

    var swapon = function(){
      console.log("Turning on swapfile...");
      var deferred = Q.defer();
      exec("swapon /swap", function(error, stdout, stderr){
        if(error instanceof Error){
          console.log("Error turning on swapfile: "+error);
          deferred.reject(error);
        }else{
          console.log("Success turning on swap");
          deferred.resolve(stdout);
        }
      });
      return deferred.promise;
    };

    var persistSwap = function(){
      console.log("Persisting swap for subsequent boots");
      var deferred = Q.defer();
      exec("echo '/swap none swap sw 0 0' >> /etc/fstab", function(error, stdout, stderr){
        if(error instanceof Error){
          deferred.reject(error);
        }else{
          deferred.resolve(stdout);
        }
      });
      return deferred.promise;
    };

    createSwap().then(
      function(){
        makeSwap().then(
          function(){
              swapon().then(
                function(){
                  persistSwap();
                }
              );
          }
        );
      }
    );
  }
};
