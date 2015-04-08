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

      var message;

      if (messageField.val() === '/start') {
        
        // Let's start a game
        fireHangman.start();

      } else {
        var nameTmp;

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
      }
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
      wordsChild,
      gameRunning,
      gameRecords,
      gameRef, 
      wordRecords, 
      selectedWord, 
      selectedHint,
      usedLetters,
      playersRef,
      playerList,
      playerId,
      userId;

  usedLetters = '';

  botSays = function(message) {
    var payload = {
      name: '** FIREBOT **',
      message: message
    };
    messagesRef.push(payload);
  };

  setRandomWord = function() {
    var keys = Object.keys(wordRecords);
    var randomNumber = Math.floor(Math.random() * keys.length);
    
    selectedWord = wordRecords[keys[randomNumber]].word;
    selectedHint = wordRecords[keys[randomNumber]].hint;
    console.log(selectedWord, selectedHint);

    var blanks = setBlanksForWord();

    var gameState = {
      word: selectedWord,
      message: selectedHint,
      wordState: blanks,
      usedLetters: usedLetters,
      turn: 0,
      left: 7
    };

    gameRef = gameChild.push();
    gameRef.set(gameState);

    botSays("New game started! Word/Phrase <span class='blanks'>" + blanks + "</span>");
    botSays("The current hint is:" + selectedHint);

    playersRef.child(0).once('value', function(snapshot) {
      botSays("It's your turn " + snapshot.val() + "! Guess with /guess {{letter}}");
    });

  };

  setBlanksForWord = function () {  
    var output = "";
    for (var i = 0, len = selectedWord.length; i < len; i++) {
      if (selectedWord[i] === ' ') {
        output = output + " ";
      } else {
        output = output + "_";
      }
    }
    return output;
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
          // Still nothing here...keep waiting I'm saying it's going to be awesome!
      });

      // All good on the player front, now start playing
        gameChild.on('child_added', function(snapshot) {
          if(snapshot.val() === null) {
            gameRunning = false;
            console.log('Error: No Game Running in Firebase!');
          } else {
            gameRunning = true;
            gameRef = firebaseRef.child("game/" + snapshot.key());
            gameRecords = snapshot.val();

            selectedWord = gameRecords.word;
            selectedHint = gameRecords.message;
            usedLetters = gameRecords.usedLetters;

            if (gameRecords.word === gameRecords.wordState || gameRecords.left === 0) {
              reset();
            }
          }
        });
        gameChild.on('child_changed', function(snapshot) {
          if(snapshot.val() === null) {
            gameRunning = false;
            console.log('Error: No Game Running in Firebase!');
          } else {
            gameRunning = true;
            gameRecords = snapshot.val();

            selectedWord = gameRecords.word;
            selectedHint = gameRecords.message;
            usedLetters = gameRecords.usedLetters;

            if (gameRecords.word === gameRecords.wordState || gameRecords.left === 0) {
              reset();
            }
          }
        });

      // Our game words
      wordsChild = firebaseRef.child("words");
      wordsChild.on('value', function(snapshot) {
        if(snapshot.val() === null) {
          console.log('Error: No Words in Firebase!');
        } else {
          wordRecords = snapshot.val();
        }
      });

    },
    start: function() {
      if (gameRunning) {
        botSays("Hey, pay attention. We've already started a game.");
        botSays("The current hint is: <em>" + gameRecords.message + "</em>");
      } else {
        setRandomWord();
      }
    }
  }; 
})();
          