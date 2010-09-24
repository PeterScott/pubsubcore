Chat Example
==========

This shows how to write a web chat server with pubsubcore. The server itself is in `chatserver.js`, and the client is in the `webroot/` folder. The client JavaScript is actually written in ParenScript, but should be easy to follow even if you don't know that language. The main point is that it's really just subscribing to rooms and sending messages to channels, and opening a connection. Easy. The rest is just user interface stuff.

To compile app.coffee so you can run the example, use this command:

    $ coffee -c app.coffee
    
If you don't have CoffeeScript installed, you can get it with npm:

    $ npm install coffee-script
