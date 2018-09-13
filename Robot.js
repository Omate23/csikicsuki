//var fs = require('fs');
var tradovate = require('./tradovate1');
var Trade = require('./Trade');

var ids = 0;

function Robot(r, settings) {
    this.id = ids++;

    for (var i in r) { this[i] = r[i] }
    this.env = {}
    for (var i in settings) { this.env[i] = settings[i] }

    //var dir = './data/';
    //this.settings = JSON.parse(fs.readFileSync(dir + r.algo + '.json', 'utf8'));

    this.position = 0;
    this.direction = '';
    this.price = '';

    this.ordering = false;  // order sent, waiting for orderId
    this.trades = [];
}

Robot.prototype.getSettings = function () { return this.settings }

Robot.prototype.getTradeByOrderId = function (oid) {
    for (var ti=0, tlen=this.trades.length; ti<tlen; ++ti) {
        if (this.trades[ti].orderId == oid) return this.trades[ti]
    }
    return false
}

Robot.prototype.getTradeByContractId = function (cid) {
    for (var ti=0, tlen=this.trades.length; ti<tlen; ++ti) {
        if (this.trades[ti].contractId == cid) return this.trades[ti]
    }
    return false
}

Robot.prototype.Order = function(orderId) {
    this.trades.push(new Trade(this.id, orderId))
    console.log(this.trades);
}

Robot.prototype.OpenFill = function(data) {
    var trade = this.getTradeByOrderId(data.orderId);
    if (!trade) return false
    trade.Open(data)
    console.log(this.trades);
}

Robot.prototype.CloseFill = function(data) {
    var trade = this.getTradeByOrderId(data.orderId);
    if (!trade) return false
    trade.Close(data)
    console.log(this.trades);
}

Robot.prototype.Open = function () {
    //console.log(this);
    var order = { 'accountId': this.env.accountId, 'action': this.direction, 'symbol': this.symbol, 'orderQty': this.lots }
    this.ordering = true;
    tradovate.Place(order);
    this.position = ''
}

Robot.prototype.CloseAll = function () {
    if (this.position > 0) {
        tradovate.Place({ 'accountId': this.env.accountId, 'action': 2, 'symbol': this.symbol, 'orderQty': Math.abs(this.position) })
    }
    else if (this.position < 0) {
        tradovate.Place({ 'accountId': this.env.accountId, 'action': 1, 'symbol': this.symbol, 'orderQty': Math.abs(this.position) })
    }
    this.position = ''
    this.direction = ''
    //console.log(control);
}

module.exports = Robot;