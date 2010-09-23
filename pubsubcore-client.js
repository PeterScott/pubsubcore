// PubSubCore client code. Requires that the Socket.IO client code be
// loaded first.

// Create with "new PubSubCore(socket)". Socket is optional.
function PubSubCore(socket) {
    var self = this;
    this.connected = false;

    this.join_room = function(username, room) {
	self.socket.send({connect: {name: username, room: room}});
    };

    this.send = function(channel, msg) {
	msg.channel = channel;
	self.socket.send(msg);
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

    this.connect = function() {
	self.socket.connect();
	setTimeout(function() {
	    if (!self.connected) self.connect();
	});
    };

    this.socket = socket || new io.Socket();
    this.socket.on('connect', function() {
	self.connected = true;
	console.log("PubSubCore: Connected to server");
	self.onconnect();
    });

    this.socket.on('disconnect', function() {
	self.connected = false;
	console.log("PubSubCore: Server connection lost");
	setTimeout(self.connect, 5000);  // Reconnect in 5 seconds
    });

    this.socket.on('message', function(msg) {
	console.log('MSG:', msg);
	console.log(self.onmessage);
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