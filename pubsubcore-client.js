// PubSubCore client code. Requires that the Socket.IO client code be
// loaded first.

var PubSubCore = {
    connected: false,
    
    join_room: function(username, room) {
	PubSubCore.socket.send({connect: {name: username, room: room}});
    },

    send: function(channel, msg) {
	msg.channel = channel;
	PubSubCore.socket.send(msg);
    },

    // Raw event handlers, for clients who want them.
    onconnect: function() {},
    ondisconnect: function() {},
    onmessage: function() {},

    // Higher-level handlers
    onerror: function(msg) {
	console.log("PubSubCore Error:", msg);
    },
    onannounce: function(msg) {
	console.log("PubSubCore Announcement:", msg);
    },

    // List of [regexp, msg_handler] pairs
    handlers: [],

    add_handler: function(regexp, handler) {
	var re2;
	if (typeof(regexp) == 'string')
	    re2 = {test: function(str) { return str === regexp; }};
	else 
	    re2 = regexp;
	PubSubCore.handlers.push([re2, handler]);
    },

    default_handler: function() {},

    connect: function() {
	PubSubCore.socket.connect();
	setTimeout(function() {
	    if (!PubSubCore.connected) PubSubCore.connect();
	});
    }
};

(function() {
    var socket = new io.Socket();
    PubSubCore.socket = socket;

    socket.on('connect', function() {
	PubSubCore.connected = true;
	console.log("PubSubCore: Connected to server");
	PubSubCore.onconnect();
    });

    socket.on('disconnect', function() {
	PubSubCore.connected = false;
	console.log("PubSubCore: Server connection lost");
	setTimeout(PubSubCore.connect, 5000);  // Reconnect in 5 seconds
    });

    socket.on('message', function(msg) {
	PubSubCore.onmessage(msg);
	
	if (msg.hasOwnProperty('error'))
	    PubSubCore.onerror(msg);
	else if (msg.hasOwnProperty('announcement'))
	    PubSubCore.onannounce(msg);
	else if (!msg.hasOwnProperty('room'))
	    PubSubCore.onerror({error: "No room specified", msg: msg});
	else {
	    for (var i = 0; i < PubSubCore.handlers.length; i++)
		if (PubSubCore.handlers[i][0].test(msg.room)) {
		    PubSubCore.handlers[i][1](msg);
		    return;
		}
	    // No handler found
	    PubSubCore.default_handler(msg);
	}
    });
})();