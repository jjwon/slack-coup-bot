## Design

### Initialization and game start
1. Bot logs in, and then looks for messages addressing it which trigger game start
2. Bot polls in chat to see if anyone wants to play a game.
3. Bot collects players, and if there's enough players, then we start a game.

Note that most of the logic in `slack-poker-bot` for the bot is more or less completely reusable.

### Game flow
1. Character cards are dealt out to the different players, all currently face down.
2. Turns begin:
  1. Player announces an action. If you have more than 10 coins, you must coup.
  2. Bot asks for challenges. If none, then continue. Cannot challenge coup or income.
  3. Bot asks for responses. If none, then action is processed and turn ends. Only some actions are responses
  4. Bot asks for challenges. If none, turn ends.

### Challenges
1. Challenger challenges player.
2. Bot dms player and asks which card to turn face-up.
  a. If the card turned-up defeats the challenge, then insert the card back in the deck, shuffle, and get new card. Bot dms challenger and asks which card to turn face-up (when timer expires, the first facedown influence is chosen).
  b. If the card turned-up fails the challenge, then the turn ends, resulting in either the action going through (if this challenge is for the initial action), or the action failing (if this is the response).
  
### General logistics
- Between turns, we display the board consisting of how many coins a player has, what face-up cards there are. This can be borrowed from `slack-poker-bot` also.
- Card and Deck logic is also borrowable from `slack-poker-bot`.  We can also borrow some of the helpers to deal with message processing. I'd actually like to abstract *all* message related processing into it's own file.
