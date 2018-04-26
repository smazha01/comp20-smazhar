var express = require('express');
var bodyParser = require('body-parser'); // Required if we need to use HTTP post parameters
var validator = require('validator'); // See documentation at https://github.com/chriso/validator.js
var app = express();
// See https://stackoverflow.com/questions/5710358/how-to-get-post-query-in-express-node-js
app.use(bodyParser.json());
// See https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
app.use(bodyParser.urlencoded({ extended: true })); // Required if we need to use HTTP post parameters

// Mongo initialization and connect to database
// process.env.MONGODB_URI is the default environment variable on Heroku for the MongoLab add-on
// process.env.MONGOLAB_URI is the old environment variable on Heroku for the MongoLab add-on
// process.env.MONGOHQ_URL is an environment variable on Heroku for the MongoHQ add-on
// If environment variables not found, fall back to mongodb://localhost/nodemongoexample
// nodemongoexample is the name of the database

var mongoUri = process.env.MONGODB_URI || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost';
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var db = MongoClient.connect(mongoUri, function(error, databaseConnection) {
        db = databaseConnection;
});
var vehicles = ["JANET", "lGhCpJCE5K", "K9m65WRQyh", "3VaFZQS9Ee", "qrsXYLSLFw", "TapqFEtdFF", "FwXkFfHWwT", "E1TmLM4UO6", "6VvCKigQ21", "YTBj8wiOXz", "KiztarwO7h", "Ein4EIwThk", "5EmzPciOP1", "dPA7wAzZoe", "QMrHmCoyCE", "oRF2MrZv83", "DsRILKPCEf", "bomkcQM8oI"];

//Allow CORS
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


/* dwR3TbOH requested a vehicle at 10.1, 10.2 on 2018-02-09T02:25:19.575Z. */
app.get('/', function(request, response) {
        response.set('Content-Type', 'text/html');
        var indexPage = '';
        db.collection('passengers', function(er, collection) {
                if (er) {
                    console.log(er);
                    return;
                }
                else {
                    collection.find().sort({'created_at':-1}).toArray(function(err, results) {
                            // All results of db.fooditems.find() will go into...
                            // ...`results`.  `results` will be an array (or list)
                            if (!err) {
                                    indexPage += "<!DOCTYPE HTML><html><head><title>Passenger Storage</title></head><body><h1>Passenger Storage</h1>";
                                    for (var count = 0; count < results.length; count++) {
                                            var time = new Date(results[count].created_at);
                                            indexPage += "<p>" + results[count].username + " requested a vehicle at " +
                                            results[count].lat + ", " + results[count].lng + " on " + time.toISOString()+ "." + "</p>";
                                    }
                                    indexPage += "</body></html>"
                                    response.send(indexPage);
                            } else {
                                    response.send('<!DOCTYPE HTML><html><head><title>Passenger Storage</title></head><body><h1>Whoops, something went terribly wrong!</h1></body></html>');
                            }
                    });                    
                }
        });
});

app.get('/vehicle.json', function(request, response) {
        var username = request.query.username;
        if (!username) {
                response.send({});
        }
        else {
                db.collection('vehicles', function(error, coll) {
                        if (error) {
                                console.log(error);
                        }
                        else {
                                coll.find({"username":username}).toArray(function(err,results) {
                                        if (results.length == 0) {
                                                response.send({});
                                        }
                                        else {
                                                response.send(results[0]);
                                        }
                                });
                        }
                });
        }
});

app.post('/rides', function(request, response) {
        var username = request.body.username;
        var lat = request.body.lat;
        var lng = request.body.lng;
        var time = new Date();
        if ((username) && (lat) & (lng)) {
            var toInsert = {
                            "username": username,
                            "lat": lat,
                            "lng": lng,
                            "created_at": time
                    };
             if (vehicles.indexOf(username) != -1) {
                    db.collection('vehicles', function(error, coll) {
                        if (error) {
                                console.log(error);
                        }
                        else {
                                coll.update({username : username}, toInsert, {upsert:true});  
                                var fiveMinutesAgo = new Date(new Date().getTime() - 1000 * 60 * 5);
                                db.collection('passengers', function (error, coll) {
                                    if (error) {
                                        console.log(error);
                                        return;
                                    }
                                    else {
                                        coll.find({created_at : {$gt: fiveMinutesAgo}}).toArray(function(error, results) {
                                                var passengers_json = {
                                                        passengers: results
                                                };
                                                response.send(passengers_json);
                                        });                                        
                                    }
                                }); 
                             }       
                        });
            }
            else{
                    db.collection('passengers', function(error, coll) {
                        if (error) {
                                console.log(error);
                        }
                        else {
                                coll.update({username : username}, toInsert, {upsert:true});  
                                var fiveMinutesAgo = new Date(new Date().getTime() - 1000 * 60 * 5);
                                db.collection('vehicles', function (error, coll) {
                                        coll.find({created_at : {$gt: fiveMinutesAgo}}).toArray(function(error, results) {
                                                var vehicles_json = {
                                                        vehicles: results
                                                };
                                                response.send(vehicles_json);
                                        });
                                }); 
                        }
                });
                }
        }

        else{
            response.send({"error":"Whoops, something is wrong with your data!"});
        }
});

app.listen(process.env.PORT || 5000)
