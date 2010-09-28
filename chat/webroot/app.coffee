#
# Chatting code
#

username = null
chatroom = null
pubsub   = new PubSubCore()

press_signin_button = (e) ->
  $("#signin-button").click() if e.keyCode == 13

$ ->
  $("#username").keypress press_signin_button
  $("#chatroom").keypress press_signin_button

  $("#signin-button").click ->
    username = $("#username").val()
    chatroom = $("#chatroom").val().replace(/\//g, '')
    if username.length == 0 or chatroom.length == 0
      alert "You must enter a username and chatroom"
    else
      # Join the chat room, and add message handlers
      pubsub.join_room username, chatroom;
      pubsub.add_handler '/command/list', get_user_handler
      pubsub.add_handler chatroom, chat_handler
      # Hide the login box, and show the chat box.
      $("#signin").hide()
      $("#chat").show()

  $("#chatline").keypress (e) ->
    if e.keyCode == 13
      text = $("#chatline").val()
      # Either send a command, or send a chat message.
      if text is '/list'
        pubsub.send('/command/list', {room: chatroom});
      else
        pubsub.send(chatroom, {name: username, text: text});
      $("#chatline").val ''

chat_window_append = (txt) ->
  cw = $('#chatwindow')
  cw.append txt
  cw.scrollTop(cw.height())

show_message = (name, text) ->
  chat_window_append "<p><b>#{name}:</b> #{text}</p>"

# Handle a chat message: just show it in the box.
chat_handler = (msg) ->
  show_message msg.data.name, msg.data.text

# Print the user list in the chat box
get_user_handler = (msg) ->
  users_str = msg.users.join ', '
  chat_window_append "<p><i><b>Users:</b> #{users_str}</i></p>"

# Announce the presence of a new user or connection
pubsub.onannounce = (msg) ->
  chat_window_append "<p><i>#{msg.name} #{msg.action}</i></p>"

#
# Connection logging code
#

pubsub.onconnect = ->
  $("#log").append "<p>Connected to server</p>"
  if username? then pubsub.join_room(username, chatroom)

pubsub.ondisconnect = ->
  $("#log").append "<p>Server connection lost</p>"

pubsub.onmessage = (msg) ->
  json_msg = JSON.stringify msg
  $("#log").append "<p>Message: #{json_msg}</p>"

# Start the connection
pubsub.connect()