var http = require('http');
var fs = require('fs');

try {
  var pathToken = process.env.SLACK_COUP_BOT_TOKEN;
  var token = pathToken || fs.readFileSync('token.txt', 'utf8').trim();
} catch (error) {
  console.log("Your API token should be placed in a 'token.txt' file, which is missing.");
  return;
}

var CoupBot = require('./coup-bot');
var bot = new CoupBot(token);
bot.login();

// Heroku requires the process to bind to this port within 60 seconds or it is killed 
http.createServer(function(req, res) {
  res.end('SLACK_COUP_BOT');
}).listen(process.env.PORT || 5000)
