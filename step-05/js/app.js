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

      } else if (new RegExp('\/guess', 'i').test(messageField.val())) {

        // Looks like we're guessing a letter
        var letter = messageField.val().slice(-1);
        fireHangman.guess(letter);

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

  replaceAt = function(string, index, character) {
    return string.substr(0, index) + character + string.substr(index+character.length);
  }

  updateBlanksForWord = function(letter) {
    var index = 0;
    var wordState = gameRecords.wordState;
   
    index = selectedWord.indexOf(letter);
    while (index >= 0) {
      wordState = replaceAt(wordState, index, letter);
      index = selectedWord.indexOf(letter, index + 1);
    }

    return wordState;
  };

  reset = function(){
    gameRef.remove();
    gameRunning = false;
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
    },
    guess: function(letter) {

      if (gameRecords.turn === playerId) {
        var updateWord = updateBlanksForWord(letter);
        var turnsLeft = gameRecords.left - 1;
        usedLetters = usedLetters + letter;
        
        if (selectedWord.indexOf(letter) !== -1){

          botSays("We have a hit captain!");

          if (gameRecords.word === updateWord) {
            botSays("Winner winner firebase dinner! You did it " + userId + "! Answer:" + selectedWord);
          } else {
            botSays("Turns left: " + gameRecords.left);
            botSays("Word state: <span class='blanks'>" + updateWord + "</span>");
          }

          gameRef.update({
            usedLetters: usedLetters,
            wordState: updateWord,
            turn: playerId,
            left: gameRecords.left
          });

        } else {

          botSays("We have missed, the meter grows towards death.");

          if (turnsLeft === 0) {
            botSays("It's game over mannnnn! Answer was: " + selectedWord);

            gameRef.update({
              left: 0
            });

          } else {
            botSays("Turns left: " + turnsLeft);
            botSays("Word state: <span class='blanks'>" + gameRecords.wordState + "</span>");

            // Increment the turn
            playersRef.child(playerId+1).once('value', function(snapshot) {
              var nextTurn = 0;

              if (snapshot.val() !== null) {
                nextTurn = playerId+1;
              } 

              gameRef.update({
                usedLetters: usedLetters,
                wordState: updateWord,
                turn: nextTurn,
                left: turnsLeft
              });

              playersRef.child(nextTurn).once('value', function(snapshot) {
                if (snapshot.val() !== null) {
                  botSays("It's your turn " + snapshot.val() + "! Guess with /guess {{letter}}");
                } else {
                  playersRef.child(nextTurn).once('value', function(snapshot) { 
                    botSays("It's your turn " + snapshot.val() + "! Guess with /guess {{letter}}");
                  });
                }
              });

            });
          }
        }
      } else {
        botSays("Whooaaa there " + userId + ", it's not your turn. Slow your roll.");
      }
    }
  };
 
})();
          