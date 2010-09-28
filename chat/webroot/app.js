(function() {
  var chat_handler, chat_window_append, chatroom, get_user_handler, press_signin_button, pubsub, show_message, username;
  username = null;
  chatroom = null;
  pubsub = new PubSubCore();
  press_signin_button = function(e) {
    if (e.keyCode === 13) {
      return $("#signin-button").click();
    }
  };
  $(function() {
    $("#username").keypress(press_signin_button);
    $("#chatroom").keypress(press_signin_button);
    $("#signin-button").click(function() {
      username = $("#username").val();
      chatroom = $("#chatroom").val().replace(/\//g, '');
      if (username.length === 0 || chatroom.length === 0) {
        return alert("You must enter a username and chatroom");
      } else {
        pubsub.join_room(username, chatroom);
        pubsub.add_handler('/command/list', get_user_handler);
        pubsub.add_handler(chatroom, chat_handler);
        $("#signin").hide();
        return $("#chat").show();
      }
    });
    return $("#chatline").keypress(function(e) {
      var text;
      if (e.keyCode === 13) {
        text = $("#chatline").val();
        if (text === '/list') {
          pubsub.send('/command/list', {
            room: chatroom
          });
        } else {
          pubsub.send(chatroom, {
            name: username,
            text: text
          });
        }
        return $("#chatline").val('');
      }
    });
  });
  chat_window_append = function(txt) {
    var cw;
    cw = $('#chatwindow');
    cw.append(txt);
    return cw.scrollTop(cw.height());
  };
  show_message = function(name, text) {
    return chat_window_append("<p><b>" + (name) + ":</b> " + (text) + "</p>");
  };
  chat_handler = function(msg) {
    return show_message(msg.data.name, msg.data.text);
  };
  get_user_handler = function(msg) {
    var users_str;
    users_str = msg.users.join(', ');
    return chat_window_append("<p><i><b>Users:</b> " + (users_str) + "</i></p>");
  };
  pubsub.onannounce = function(msg) {
    return chat_window_append("<p><i>" + (msg.name) + " " + (msg.action) + "</i></p>");
  };
  pubsub.onconnect = function() {
    $("#log").append("<p>Connected to server</p>");
    return (typeof username !== "undefined" && username !== null) ? pubsub.join_room(username, chatroom) : null;
  };
  pubsub.ondisconnect = function() {
    return $("#log").append("<p>Server connection lost</p>");
  };
  pubsub.onmessage = function(msg) {
    var json_msg;
    json_msg = JSON.stringify(msg);
    return $("#log").append("<p>Message: " + (json_msg) + "</p>");
  };
  pubsub.connect();
})();
