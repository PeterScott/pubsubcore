// PubSubCore: Simple pub/sub library for Node.js and Socket.IO

var sys  = require('sys');
var sets = require('simplesets');
var io   = require('socket.io')

//////////////////////////////
// Tracking who's in what room
//////////////////////////////

// Dict mapping room names with people to sets of client objects.
var rooms = {};
// Dict mapping room names with people to sets of usernames.
var room_users = {};
// Dict mapping sids to sets of rooms.
var sid_rooms = {};

// Add a client to a room and return the sid:client mapping.
function add_to_room(client, room, callback) {
    console.log('Client ' + client.username + ' (' + client.sessionId + ') added to room ' + room);

    if (!(sid_rooms.hasOwnProperty(client.sessionId))) sid_rooms[client.sessionId] = new sets.Set();
    sid_rooms[client.sessionId].add(room);

    if (!(rooms.hasOwnProperty(room))) rooms[room] = new sets.Set();
    rooms[room].add(client);

    if (!(room_users.hasOwnProperty(room))) room_users[room] = new sets.Set();
    room_users[room].add(client.username);

    callback(rooms[room].array());
}

// Remove a client from all rooms and return the username:client
// mapping for everybody in those rooms.
function remove_from_all_rooms(client, callback) {
    var affected_clients = new sets.Set();
    if (sid_rooms.hasOwnProperty(client.sessionId)) {
	var client_rooms = sid_rooms[client.sessionId].array();
	for (var i = 0; i < client_rooms.length; i++) {
	    var room = client_rooms[i];
	    if (rooms.hasOwnProperty(room)) {
		rooms[room].remove(client);
		if (rooms[room].size() === 0)
		    delete rooms[room];
	    }
	    if (room_users.hasOwnProperty(room)) {
		room_users[room].remove(client.username);
		if (room_users[room].size() === 0)
		    delete room_users[room];
	    }
	    if (rooms.hasOwnProperty(room)) {
		var this_room = rooms[room].array();
		for (var j = 0; j < this_room.length; j++)
		    affected_clients.add(this_room[j]);
	    }
	}
    }
    console.log('Client ' + client.username + ' (' + client.sessionId + ') disconnected.');
    delete sid_rooms[client.sessionId];
    callback(affected_clients.array());
}

// Remove a client from a room and return the username:client mapping
// for everybody in that room. Returns [] if the room does not exist,
// or if the client was not in the room to begin with.
function remove_from_room(client, room, callback) {
    if (!rooms.hasOwnProperty(room) || !rooms[room].has(client)) {
	callback([]);
	return;
    }
    
    // Delete from the room
    rooms[room].remove(client);
    if (rooms[room].size() === 0)
	delete rooms[room];
    if (room_users.hasOwnProperty(room)) {
	room_users[room].remove(client.username);
	if (room_users[room].size() === 0)
	    delete room_users[room];
    }

    callback(exports.room_clients(room));
}

// Return list of clients in the given room.
exports.room_clients = function(room) {
    return rooms.hasOwnProperty(room) ? rooms[room].array() : [];
}

// Return true if room contains the given client, false otherwise.
exports.client_in_room = function(room, client) {
    return rooms.hasOwnProperty(room) && rooms[room].has(client);
}

// Return list of usernames in given room
exports.users_in_room = function(room) {
    return room_users.hasOwnProperty(room) ? room_users[room].array() : [];
}

//////////////////////////////
// Channel handler functions
//////////////////////////////

// List of [regexp, handler_function] pairs. The first one to match
// will be used, so the order in which you add these matters.
var handlers = [];

// Add a handler function for a channel denoted by a given regexp. The
// regexp can be either a regular expression object or a string. The
// handler takes a Socket.IO client object and a JSON message as
// arguments. The message is in the format {channel: 'foo', data: {...}}.
exports.add_handler = function(regexp, handler) {
    handlers.push([regexp, handler]);
}

// Return the handler function for a given channel, or a default
// handler if none was found.
function get_handler(channel) {
    for (var i = 0; i < handlers.length; i++) {
	var this_handler = handlers[i][0];
	if (typeof this_handler === "string" && this_handler === channel
	    || typeof this_handler === "function" && this_handler.test(channel))
	    return handlers[i][1];
    }
    // If no handler was found, return a default function.
    return function(client, msg) {
	client.send({error: 'No handler for channel "' + channel + '"'});
    }
}

//////////////////////////////
// Socket.IO server setup
//////////////////////////////

var socket;

// Call this function on an HTTP server object to add the hooks.
exports.listen = function(server) {
    socket = io.listen(server);
    
    socket.on('connection', function(client) {
	client.on('message', function(msg) {
	    if (msg.hasOwnProperty('connect')) {
		if (!(msg.connect.name && msg.connect.room)) {
		    console.log("Invalid connect message:", msg);
		    client.send({error: "Invalid connect message"});
		} else {
		    client.username = msg.connect.name;
		    // Add user info to the current dramatis personae
		    add_to_room(client, msg.connect.room, function(clients) {
			// Broadcast new-user notification
			for (var i = 0; i < clients.length; i++)
			    clients[i].send({
				announcement: true,
				name: client.username,
				action: 'connected'
			    });
		    });
		}
	    } else if (msg.hasOwnProperty('leave_room')) {
		remove_from_room(client, msg.leave_room, function(clients) {
		    console.log(client.username + ' disconnected, yo');
		    console.log(clients);
		    for (var i = 0; i < clients.length; i++)
			clients[i].send({
			    announcement: true,
			    name: client.username || 'anonymous',
			    action: 'disconnected'
			});
		});
	    } else {
		// Dispatch to channel handler function
		if (!msg.channel) {
		    console.log("Unknown channel for message:", sys.inspect(msg));
		    client.send({error: 'Unknown channel "' + msg.channel + '"'});
		} else {
		    get_handler(msg.channel)(client, msg);
		}
	    }
	});
	client.on('disconnect', function() {
	    remove_from_all_rooms(client, function(clients) {
		for (var i = 0; i < clients.length; i++)
		    clients[i].send({
			announcement: true,
			name: client.username || 'anonymous',
			action: 'disconnected'
		    });
	    });
	});
    });
}

//////////////////////////////
// Broadcasting functions
//////////////////////////////

// Broadcast message to all clients
exports.broadcast = function(msg) {
    if (socket) socket.broadcast(msg);
}

// Broadcast message to all clients in a given room.
exports.broadcast_room = function(room, msg) {
    var clients = exports.room_clients(room);
    for (var i = 0; i < clients.length; i++)
	clients[i].send(msg);
}