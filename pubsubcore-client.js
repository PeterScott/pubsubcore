// PubSubCore client code. Requires that the Socket.IO client code be
// loaded first.

// Create with "new PubSubCore(socket)". Socket is optional.
function PubSubCore(socket) {
    var self = this;
    this.connected = false;

    // A list of [username, room] pairs, for the rooms we're in now.
    this.rooms_joined = [];

    this.join_room = function(username, room) {
	self.socket.send({connect: {name: username, room: room}});
	self.rooms_joined.push([username, room]);
    };

    this.leave_room = function(room) {
	self.socket.send({leave_room: room});
	// Remove us from rooms_joined
	for (var i = 0; i < self.rooms_joined.length; i++)
	    if (self.rooms_joined[i][1] === room)
		self.rooms_joined.splice(i, 1);
    };

    this.send = function(channel, msg) {
	self.socket.send({channel: channel, data: msg});
    };

    // Raw event handlers, for clients who want them.
    this.onconnect = function() {};
    this.ondisconnect = function() {};
    this.onmessage = function() {};
    
    // Higher-level handlers
    this.onerror = function(msg) {
	console.log("PubSubCore Error:", msg);
    };
    this.onannounce = function(msg) {
	console.log("PubSubCore Announcement:", msg);
    };

    // List of [regexp, msg_handler] pairs
    this.handlers = [];

    this.add_handler = function(regexp, handler) {
	self.handlers.push([regexp, handler]);
    };

    this.default_handler = function() {};

    this.reconnects = 0;

    function rand_range(a, b) {
	return a + Math.random() * (b - a);
    }

    function backoff_time() {
	var R = rand_range(1, 2);
	var backoff = Math.min(R * 300 * Math.pow(2, self.reconnects), rand_range(5000, 10000));
	console.log("PubSubCore: Backoff time: " + backoff + " ms");
	return backoff;
    }

    this.connect = function() {
	self.socket.connect();
	setTimeout(function() {
	    if (!self.connected) { 
		self.reconnects++;
		self.connect();
	    } else {
		self.reconnects = 0;
	    }	    
	}, backoff_time());
    };

    this.socket = socket || new io.Socket();
    this.socket.on('connect', function() {
	self.connected = true;
	console.log("PubSubCore: Connected to server");
	// Rejoin any rooms we're in
	for (var i = 0; i < self.rooms_joined.length; i++)
	    self.socket.send({connect: {name: self.rooms_joined[i][0], room: self.rooms_joined[i][1]}});
	self.onconnect();
    });

    this.socket.on('disconnect', function() {
	self.connected = false;
	console.log("PubSubCore: Server connection lost");
	setTimeout(self.connect, backoff_time());
    });

    this.socket.on('message', function(msg) {
	self.onmessage(msg);
	
	if (msg.hasOwnProperty('error'))
	    self.onerror(msg);
	else if (msg.hasOwnProperty('announcement'))
	    self.onannounce(msg);
	else if (!msg.hasOwnProperty('room'))
	    self.onerror({error: "No room specified", msg: msg});
	else {
	    for (var i = 0; i < self.handlers.length; i++) {
		var this_handler = self.handlers[i][0];
		if (typeof this_handler === "string" && this_handler === msg.room
		    || typeof this_handler === "function" && this_handler.test(msg.room)) {
		    self.handlers[i][1](msg);
		    return;
		}
	    }
	    // No handler found
	    self.default_handler(msg);
	}
    });
}