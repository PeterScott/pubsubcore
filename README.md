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
        var usernames = pubsub.users_in_room(msg.room);
        console.log("Users in " + msg.room + ":", sys.inspect(usernames));
        client.send({users: usernames, room: '/command/list'});
    });
    
    // Requests to any other channel are treated as chat messages.
    pubsub.add_handler(/.*/, function(client, msg) {
        console.log("MSG:", sys.inspect(msg));
        // Treat the channel name as the room name.
        pubsub.broadcast_room(msg.channel, {
            name: msg.name,
            text: msg.text,
            room: msg.channel
        });
    });
    
    // Start the server
    server.listen(8124);
    console.log('Server running at http://127.0.0.1:8124/');

The client code is located in `chat/webroot/`, but let's look at how the server works. First, it imports some modules and starts serving static files using [paperboy](http://github.com/felixge/node-paperboy/). As in Socket.IO, the pubsubcore module attaches itself to an HTTP server object. Then it defines two channel handlers. Each channel handler should handle a different type of message from the client. The chat client sends two types of messages: ordinary chat messages, and requests for a user list.

Requests for a user list go to the `/command/list` channel. The naming of these channels is arbitrary; the slashes are just to make it obvious that this is a list command. Here's the code again:

    // Requests to the channel "/command/list" return username lists.
    pubsub.add_handler('/command/list', function(client, msg) {
        var usernames = pubsub.users_in_room(msg.room);
        console.log("Users in " + msg.room + ":", sys.inspect(usernames));
        client.send({users: usernames, room: '/command/list'});
    });

When a message comes in to that channel, the handler function is given two arguments: a [Socket.IO](http://socket.io/) client object with an extra `username` property added, and the message in JSON format. The message has a `room` property specified by the client, telling what chat room it wants a user list for. The `pubsub.users_in_room(room)` function returns an array of all the usernames of the users in the specified room, in no particular order. The `client.send(msg)` function sends a JSON message to the specified client. Very simple.

The other channel handler uses a regular expression to specify what channels it listens on. In fact, it will listen on all channels that have not been matched by a previous handler:

    // Requests to any other channel are treated as chat messages.
    pubsub.add_handler(/.*/, function(client, msg) {
        console.log("MSG:", sys.inspect(msg));
        // Treat the channel name as the room name.
        pubsub.broadcast_room(msg.channel, {
            name: msg.name,
            text: msg.text,
            room: msg.channel
        });
    });

This assumes that the channel name given is also the name of the room that the client wants to chat to. It uses the `pubsub.broadcast_room(room, msg)` function to send out a message to every client in the specified room.

Finally, we start the server. You can try it out yourself.

API Reference
----------

For now, see the code and comments in `pubsubcore.js`. Full documentation coming later.
