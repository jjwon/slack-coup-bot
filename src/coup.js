const Rx = require('rx');
const _ = require('underscore-plus');

const Card = require('./card');
const Deck = require('./deck');

const FACEUP = 'faceup';
const FACEDOWN = 'facedown';


class Coup {
  // Public: Creates a new game instance.
  //
  // slack - An instance of the Slack client
  // messages - An {Observable} representing messages posted to the channel
  // channel - The channel where the game will be played
  // players - The players participating in the game
  // scheduler - (Optional) The scheduler to use for timing events

  constructor(slack, messages, channel, players, scheduler=rx.Scheduler.timeout) {
    this.slack = slack;
    this.messages = messages;
    this.channel = channel;
    this.players = players;
    this.scheduler = scheduler;

    this.deck = new Deck();
    this.deck.shuffle();
    this.gameEnded = new rx.Subject();

    // Cache the direct message channels for each player as we'll be using
    // them often, and fetching them takes linear time per number of users.
    this.playerDms = {};
    for (let player of this.players) {
      let dm = this.slack.getDMByName(player.name);
      this.playerDms[player.id] = dm;

      // If a DM channel hasn't been opened yet, we need to open one first.
      if (!dm || !dm.is_open) {
        this.slack.openDM(player.id, result => {
          if (result.ok) {
            this.playerDms[player.id] = this.slack.getDMByName(player.name);
          } else {
            console.log(`Unable to open DM for ${player.name}: ${result.error}`);
          }
        });
      }

      // Each player starts with 2 coins.
      player.coins = 2;
      player.cards = [{
        card: this.deck.dealCard(),
        status: FACEDOWN
      }, {
        card: this.deck.dealCard(),
        status: FACEDOWN
      }];
    }
  }

  // Public: Starts a new game.
  //
  // timeBetweenHands - (Optional) The time, in milliseconds, to pause between
  //                    the end of one hand and the start of another
  //
  // Returns an {Observable} that signals completion of the game
  start(timeBetweenTurns=5000) {
    this.isRunning = true;

    rx.Observable.return(true)
      .flatMap(() => this.takeTurn(this.players[0])
        .flatMap(() => rx.Observable.timer(timeBetweenTurns, this.scheduler)))
      .repeat()
      .takeUntil(this.gameEnded)
      .subscribe();

    return this.gameEnded;
  }

  // Public: Ends the current game immediately.
  //
  // Returns nothing
  quit(winner) {
    if (winner) {
      this.channel.send(`Congratulations ${winner.name}, you've won!`);
    }

    this.gameEnded.onNext(winner);
    this.gameEnded.onCompleted();

    this.isRunning = false;
  }

  // Private: Plays a single turn of Coup. The order goes like:
  // 1. Player announces an action.
  // 2. Bot asks for and processes challenges. If the challenge succeeds, then the turn ends.
  // 3. Bot asks for a response.
  // 4. Bot asks for and processes challenges.
  //   a. If the challenge succeeds, then the original action goes through.
  //   b. If the challenge fails, then no action is completed.
  //
  // Returns an {Observable} signaling the completion of the hand
  takeTurn(player) {
    let turnEnded = new rx.Subject();

    let action = deferredAction(player, turnEnded);
    this.doChallengeRound(player, action, turnEnded).subscribe(result => {
      // If no challenge is issued
      if (result.isTurnComplete) {
        this.onTurnEnded(turnEnded);
      } else {
        // Proceed to a response round
        this.doResponseRound(player, action, turnEnded);
      }
    });

    return turnEnded;
  }
}
