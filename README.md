Lightweight pub/sub core, built on Socket.IO and node.js
==========

[Socket.IO](http://socket.io/) is great for browser-based sockets, but very low-level. For making real servers, it's helpful to have higher-level abstractions. Pubsubcore provides two main concepts: *channels*, which are places that clients can send messages, and *rooms*, which are groups of clients. A client may be in more than one room.

A simple example of how this would work is web chat: you want to have several chat rooms, all run by the same server. You could define a channel handler that would listen on channels matching `/^room:.*/`, such as `"room:general-discussion"` and `"room:offtopic"`. Clients would send chat messages to those channels, and the server would broadcast valid chat messages to all the clients in the corresponding room. Any clients subscribed to that room would receive the messages; other clients would not.

Installation
----------

To install the latest version:

    $ git clone http://github.com/PeterScott/pubsubcore.git
    $ cd pubsubcore/
    $ npm link .

Usage
----------

You can find a fairly simple chat example in the `chat/` directory. Here is the entire server code:

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
    
    // Attach pubsubcore to the HTTP server.
    pubsub.listen(server);
    
    // Requests to the channel "/command/list" return username lists.
    pubsub.add_handler('/command/list', function(client, msg) {
        var usernames = pubsub.users_in_room(msg.data.room);
        console.log("Users in " + msg.data.room + ":", sys.inspect(usernames));
        client.send({users: usernames, room: '/command/list'});
    });
    
    // Requests to any other channel are treated as chat messages.
    pubsub.add_handler(/.*/, function(client, msg) {
        console.log("MSG:", sys.inspect(msg));
        // Treat the channel name as the room name.
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

The client code is located in `chat/webroot/`, but let's look at how the server works. First, it imports some modules and starts serving static files using [paperboy](http://github.com/felixge/node-paperboy/). As in Socket.IO, the pubsubcore module attaches itself to an HTTP server object. Then it defines two channel handlers. Each channel handler should handle a different type of message from the client. The chat client sends two types of messages: ordinary chat messages, and requests for a user list.

Requests for a user list go to the `/command/list` channel. The naming of these channels is arbitrary; the slashes are just to make it obvious that this is a list command. Here's the code again:

    // Requests to the channel "/command/list" return username lists.
    pubsub.add_handler('/command/list', function(client, msg) {
        var usernames = pubsub.users_in_room(msg.data.room);
        console.log("Users in " + msg.data.room + ":", sys.inspect(usernames));
        client.send({users: usernames, room: '/command/list'});
    });

When a message comes in to that channel, the handler function is given two arguments: a [Socket.IO](http://socket.io/) client object with an extra `username` property added, and the message in JSON format. The message looks like this:

    {channel: "/command/list", data: {room: "chat room name"}}

The data property contains the message from the client, telling what chat room it wants a user list for. The `pubsub.users_in_room(room)` function returns an array of all the usernames of the users in the specified room, in no particular order. The `client.send(msg)` function sends a JSON message to the specified client.

The other channel handler uses a regular expression to specify what channels it listens on. In fact, it will listen on all channels that have not been matched by a previous handler:

    // Requests to any other channel are treated as chat messages.
    pubsub.add_handler(/.*/, function(client, msg) {
        console.log("MSG:", sys.inspect(msg));
        // Treat the channel name as the room name.
        pubsub.broadcast_room(msg.channel, {
            room: msg.channel,
            data: {
                name: msg.data.name,
                text: msg.data.text
            }
        });
    });

This assumes that the channel name given is also the name of the room that the client wants to chat to. It uses the `pubsub.broadcast_room(room, msg)` function to send out a message to every client in the specified room.

Finally, we start the server. You can try it out yourself.

Server API
----------

The `pubsubcore` module defines the following exports:

* `room_clients(room)`: Return a list of Socket.IO `client` objects in the given room, or `[]` if no such room exists.

* `client_in_room(room, client)`: Return `true` if `room` contains the Socket.IO client object `client`. Return `false` if it does not, or if the given room does not exist.

* `users_in_room(room)`: Return list of the usernames of the users in the given room, or `[]` if no such room exists.

* `add_handler(channel, handler)`: Add a handler function `handler` to a channel or channels, denoted by the channel specification `channel`. The channel specification is either a string or a regular expression. If `channel` is a string, then only exact string matches will go to that handler. If it's a regular expression, the handler will be called for any channel that the regular expression matches. The handler function takes two arguments: a Socket.IO `client` object and a JSON message (call it `msg`). The message has at least two properties, guaranteed: `msg.channel` is the channel to which the message was sent, and `msg.data` is the data that the client sent.

* `listen(server)`: Listen on a given `http.Server` object. This uses the `socketio.listen` function to add Socket.IO hooks to `server`, and then configures Socket.IO for pubsubcore. This must be called as part of any program using pubsubcore. See the chat example above for details.

* `listen(server, tcp\_port, tcp\_host)`: The same as `listen(server)`, but also opens up a TCP server on the given port of the specified host. If the host is not given, it defaults to listening on localhost. Clients who connect to the TCP server can send and receive JSON messages. This is useful for debugging or for interoperating with networked programs that aren't web browsers.

* `broadcast(msg)`: Broadcast a JSON message to all clients. No processing is performed on `msg` save for stringifying it.

* `broadcast_room(room, msg)`: Broadcast a JSON message to all clients in the given room `room`. Like `broadcast`, but only sends out messages to clients who are in the specified room.

Client API
----------

First, include the Socket.IO and pubsubcore client code from your HTML:

    <script src="/socket.io/socket.io.js"></script>
    <script src="/pubsubcore-client.js"></script>

Next, in your own JavaScript code, create a new `PubSubCore` object:

    var pubsub = new PubSubCore();

You can attach event handlers to this object, define room handlers, enter and leave rooms, and send messages to channels. If you want to use an existing Socket.IO connection, you can pass this to the constructor with `new PubSubCore(socket);`. The object has the following methods and publicly-available properties:

* `connect()`: Establish a connection to the pubsubcore server. If the connection is lost, the client will automatically try to reconnect, with exponential backoff to prevent the server from being hammered with reconnection requests.

* `socket`: a Socket.IO socket object, used to connect to the server. You can use this directly if you know what you're doing. The client code is not particularly long or hard to understand, so don't be afraid to hack it if it doesn't do quite what you want it to.

* `connected`: a boolean variable; `true` if we're connected to the server, `false` otherwise.

* `join_room(username, room)`: Enter a room with the given name, using the specified username. You may only use a single username; if you try to use more than one username, the server may call you by the wrong username.

* `leave_room(room)`: Leave the given room. If we're not in that room to start with, then this does nothing.

* `send(channel, msg)`: Send a given message to `channel`. The channel is a string; the message is anything that can be serialized to JSON format.

* `add_handler(room, handler)`: Add a handler function `handler` to a room or rooms, denoted by the room specification `room`. The room specification is either a string or a regular expression. If `room` is a string, then only exact string matches will go to that handler. If it's a regular expression, the handler will be called for any room that the regular expression matches. The handler function takes one argument: a JSON message (call it `msg`). The message has at least two properties, guaranteed: `msg.room` is the room to which the message was sent, and `msg.data` is the data that the server sent.

* `default_handler`: a handler function that is called if no other handler matches the name of the room in an incoming message. By default, this function does nothing. You can override it if you wish.

* `onconnect`: a function with no arguments, called when a connection is established. Does nothing by default.

* `ondisconnect`: a function with no arguments, called when a connection is lost. Does nothing by default.

* `onmessage`: a function with one argument, `msg`, called when a message is received. Does nothing by default.

* `onerror`: a function with one argument, `msg`, called when an error message is received from the server. Logs the error message with `console.log()` by default.

* `onannounce`: a function with one argument, `msg`, called when an announcement message is received from the server. Logs the announcement message with `console.log()` by default.
