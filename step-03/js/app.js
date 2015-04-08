jQuery(document).ready(function($) {
  var baseRef = new Firebase("https://gdg-oakdale-codelab-2015.firebaseio.com");
  var messagesRef = baseRef.child("messages");
  var userId;

  if (localStorage.getItem('userId') === null) {
    userId = 'user' + parseInt(Math.random() * 1000, 10) + Date.now();
    localStorage.setItem('userId', userId);
  } else {
    userId = localStorage.getItem('userId');
  }
  $("#sysgenerateduserid").text(userId);

  var chatWindow = $("#chatWindow");
  var messageField = $("#message");
  var messageList = $("#messageList");
  var nameField = $("#name");
  
  //
  //  Initialize the game state
  //
  fireHangman.init(baseRef);

  messageField.on('keypress', function(e){
    if(e.keyCode === 13) {

      var message, 
          nameTmp;

      if (nameField.val() === '') {
        nameTmp = userId;
      } else {
        nameTmp = nameField.val();
      }

      message = {
        name: nameTmp,
        message: messageField.val(),
        userId: userId
      };

      messagesRef.push(message);

      messageField.val('');
    }
  });

  messagesRef.limitToLast(20).on('child_added', function (snapshot) {
    //GET DATA
    var data = snapshot.val();
    var name = data.name || "anonymous";
    var message = data.message;

    //CREATE ELEMENTS MESSAGE & SANITIZE TEXT
    var messageElement = $("<li>");
    var nameElement = $("<label></label>");
    nameElement.text(name);
    messageElement.html(message).prepend(nameElement);

    //ADD MESSAGE
    messageList.append(messageElement)

    //SCROLL TO BOTTOM OF MESSAGE LIST
    chatWindow[0].scrollTop = chatWindow[0].scrollHeight;
  });
});

var fireHangman = (function () {

  var firebaseRef,
      messagesRef,
      gameChild,       
      gameRef,
      playersRef,
      playerList,
      playerId,
      userId;

  botSays = function(message) {
    var payload = {
      name: '** FIREBOT **',
      message: message
    };
    messagesRef.push(payload);
  };

  return {
    init: function(context) {
      
      // Our endpoint
      firebaseRef = context;

      // Setup some references
      messagesRef = firebaseRef.child("messages");
      playersRef = firebaseRef.child("players");
      gameChild = firebaseRef.child("game");

      userId = localStorage.getItem('userId');

      // Define out players
      playersRef.transaction(function(playerList) {
        if (playerList === null) {
          playerList = [];
        }
     
        for (var i = 0; i < playerList.length; i++) {
          if (playerList[i] === userId) {
            playerId = i;
            return;
          }
        }

        playerList[i] = userId;
        playerId = i;
        return playerList;
      }, function (error, committed) {       
          // Nothing Yet...who knows...maybe we'll use this later...maybe...
      });
    }
  };
 
})();
          