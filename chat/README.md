Chat Example
==========

This shows how to write a web chat server with pubsubcore. The server itself is in `chatserver.js`, and the client is in the `webroot/` folder. The client JavaScript is actually written in ParenScript, but should be easy to follow even if you don't know that language. There's a precompiled version of the code in `app.js` if you just want to run the example. The main point is that it's really just subscribing to rooms and sending messages to channels, and opening a connection. Easy. The rest is just user interface stuff. For more details on how it works, see the main README file.
    
This example requires [paperboy](http://github.com/felixge/node-paperboy/), for serving the static files. This should not be used in production, but it will do for a simple example.
