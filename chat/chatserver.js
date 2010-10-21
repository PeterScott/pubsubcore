// Chat server using pubsubcore
var http     = require('http');
var path     = require('path');
var sys      = require('sys');
var pubsub   = require('pubsubcore');
var paperboy = require('paperboy');

// Serve static files out of ./webroot/
var WEB_ROOT = path.join(path.dirname(__filename), 'webroot');
var server = http.createServer(function(request, response) {
    paperboy.deliver(WEB_ROOT, request, response);
});

// Attach pubsubcore to the HTTP server. Also create a simple TCP
// server on localhost:9199, which you can connect to with telnet or
// something, and send and receive JSON.
pubsub.listen(server, 9199, 'localhost');

// Requests to the channel "/command/list" return username lists.
pubsub.add_handler('/command/list', function(client, msg) {
    var usernames = pubsub.users_in_room(msg.data.room);
    console.log("Users in " + msg.data.room + ":", sys.inspect(usernames));
    client.send({users: usernames, room: '/command/list'});
});

// Requests to any other channel are treated as chat messages.
pubsub.add_handler(/.*/, function(client, msg) {
    console.log("MSG:", sys.inspect(msg));
    // Treat the channel name as the room name. Turn away messages
    // from clients who aren't in the room.
    if (pubsub.client_in_room(msg.channel, client))
	pubsub.broadcast_room(msg.channel, {
            room: msg.channel,
            data: {
		name: msg.data.name,
		text: msg.data.text
            }
	});
});

// Start the server
server.listen(8124);
console.log('Server running at http://127.0.0.1:8124/');