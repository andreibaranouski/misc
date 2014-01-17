var launcher = require("../lib/launcher"),
  coax = require("coax"),
  async = require("async"),
  common = require("../tests/common"),
  util =  require("util"),
  conf_file = process.env.CONF_FILE || 'local',
  config = require('../config/' + conf_file),
  test = require("tap").test

var server, sg, gateway,
 // local dbs
 dbs = ["api-test1"];
 // local->local dbs
// repdbs = ["api-test4"];
 // sg->local dbs
 sgdbs = ["api-test7"];

var numDocs=config.numDocs || 100;




// start client endpoint
test("start test client", function(t){
  common.launchClient(t, function(_server){
    server = _server
    t.end()
  })
})

// start sync gateway
test("start syncgateway", function(t){
  common.launchSG(t, function(_sg){
    sg  = _sg
    gateway = sg.url
    t.end()
  })
})

// create all dbs
test("create test databases", function(t){
//  var alldbs = dbs.concat(repdbs)
  var alldbs = dbs.concat(sgdbs)
  common.createDBs(t, alldbs)
})


// setup push/pull replication to gateway
test("set push/pull replication to gateway", function(t){

  var i = 0
  var gatewayDB = coax([gateway, config.DbBucket]).pax().toString()
  if (config.provides=="android") gatewayDB = gatewayDB.replace("localhost", "10.0.2.2")
  async.series([
    function(sgpush){

      async.mapSeries(dbs, function(db, cb){

        coax([server, "_replicate"]).post({
            source : db,
            target : gatewayDB,
            continuous : true,	
          }, function(err, ok){
            t.equals(err, null,
              util.inspect({_replicate : db+" -> " + gatewayDB}))
            i++
            cb(err, ok)
          })

      }, sgpush)
    },
    function(sgpull){

      async.mapSeries(sgdbs, function(db, cb){

        coax([server, "_replicate"]).post({
            source : gatewayDB,
            target : db,
            continuous : true,
          }, function(err, ok){

            t.equals(err, null,
              util.inspect({_replicate : db+" <- " + gatewayDB}))
            i++
            cb(err, ok)
          })

      }, sgpull)
    }], function(err, json){
      t.false(err, "setup push pull replication to gateway")
      t.end()
    })

})	

test("load databases", function(t){
  common.createDBDocs(t, {numdocs : numDocs, dbs : dbs})
})

// purge all dbs
test("purge dbs", function(t){
  common.purgeDBDocs(t, dbs, numDocs)
})
/*		
test("done", function(t){
  common.cleanup(t, function(json){
    sg.kill()
    t.end()
  })
})*/