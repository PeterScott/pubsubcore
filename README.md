Lightweight pub/sub core, built on Socket.IO and node.js
==========

Socket.IO is great for browser-based sockets, but very low-level. For making real servers, it's helpful to have higher-level abstractions. Pubsubcore provides two main concepts: *channels*, which are places that clients can send messages, and *rooms*, which are groups of clients. A client may be in more than one room.

A simple example of how this would work is web chat: you want to have several chat rooms, all run by the same server. You could define a channel handler that would listen on channels matching `/^room:.*/`, such as `"room:general-discussion"` and `"room:offtopic"`. Clients would send chat messages to those channels, and the server would broadcast valid chat messages to all the clients in the corresponding room. Any clients subscribed to that room would receive the messages; other clients would not.

Installation
----------

To install the latest version:

    $ git clone http://github.com/PeterScott/pubsubcore.git
    $ cd pubsubcore/
    $ npm link .

Usage
----------

FIXME. This is still a double-plus pre-alpha unrelease. There'll be a web chat example coming as soon as I port it over.
