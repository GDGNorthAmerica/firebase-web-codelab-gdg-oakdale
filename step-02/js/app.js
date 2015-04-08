var baseRef = new Firebase("https://eft6dqf10dw.firebaseio-demo.com");
var messagesRef = baseRef.child("messages");

var chatWindow = $("#chatWindow");
var messageField = $("#message");
var messageList = $("#messageList");
var nameField = $("#name");

messageField.on('keypress', function(e){
  if(e.keyCode === 13) {
    var message = {
      name: nameField.val(),
      message: messageField.val()
    };

    messagesRef.push(message);

    messageField.val('');
  }
});

messagesRef.limitToLast(20).on('child_added', function (snapshot) {  
  var data = snapshot.val();
  var name = data.name || "anonymous";
  var message = data.message;
  
  var messageElement = $("<li>");
  var nameElement = $("<label></label>");
  nameElement.text(name);
  messageElement.text(message).prepend(nameElement);

  messageList.append(messageElement)

  chatWindow[0].scrollTop = chatWindow[0].scrollHeight;
});