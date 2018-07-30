var fs = require('fs');

var dir = './data/';
var settings = JSON.parse(fs.readFileSync(dir + 'settings.json', 'utf8'));
exports.settings = settings;

var symbols = JSON.parse(fs.readFileSync(dir + 'symbol.json', 'utf8'));
var symbol = symbols[settings.symbol]
exports.symbol = symbol;

//CONTROL VARS
var directions = ['','Buy','Sell'];
exports.directions = directions

var direction=0, position=0, price=0, orderId=0;
exports.direction = direction;
exports.position = position;
exports.price = price;
