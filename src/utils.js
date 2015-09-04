const Rx = require('rx');
const _ = require('underscore-plus');

class Utils {
  // Public: Checks whether the message text contains an @-mention for the
  // given user.
  static containsUserMention(messageText, userId) {
    let userTag = `<@${userId}>`;
    return messageText &&
      messageText.length >= userTag.length &&
      messageText.substr(0, userTag.length) === userTag;
  }

  // Public: Poll players that want to join the game during a specified period
  // of time.
  //
  // messages - An {Observable} representing new messages sent to the channel
  // channel - The {Channel} object, used for posting messages
  // scheduler - (Optional) The scheduler to use for timing events
  // timeout - (Optional) The amount of time to conduct polling, in seconds
  // maxPlayers - (Optional) The maximum number of players to allow
  //
  // Returns an {Observable} that will `onNext` for each player that joins and
  // `onCompleted` when time expires or the max number of players join.
  static pollPotentialPlayers(messages, channel, scheduler=rx.Scheduler.timeout, timeout=30, maxPlayers=6) {
    let formatMessage = t => `Who wants to play? Respond with 'yes' in this channel in the next ${t} seconds.`;
    let {timeExpired} = PlayerInteraction.postMessageWithTimeout(channel, formatMessage, scheduler, timeout);

    // Look for messages containing the word 'yes' and map them to a unique
    // user ID, constrained to `maxPlayers` number of players.
    let newPlayers = messages.where(e => e.text && e.text.toLowerCase().match(/\byes\b/))
      .map(e => e.user)
      .distinct()
      .take(maxPlayers)
      .publish();

    newPlayers.connect();
    timeExpired.connect();

    // Once our timer has expired, we're done accepting new players.
    return newPlayers.takeUntil(timeExpired);
  }
}

module.exports = Utils;
