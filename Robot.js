//var fs = require('fs');
var request = require('request');
var tradovate = require('./tradovate1');
var Trade = require('./Trade');

var ids = 0;

function Robot(r, settings) {
    for (var i in r) { this[i] = r[i] }
    this.env = {}
    for (var i in settings) { this.env[i] = settings[i] }

    //var dir = './data/';
    //this.settings = JSON.parse(fs.readFileSync(dir + r.algo + '.json', 'utf8'));

    this.id = ids++;
    this.position = 0;
    this.oldposition = 0;
    this.direction = '';
    this.price = '';

    // when orderid received, we use these to decide original intention
    this.opening = false;  // closing order sent
    this.closing = false;  // closing order sent

    this.trades = [];
    //console.log(this);

}

/*Robot.prototype.getSettings = function () { return this.settings }*/

Robot.prototype.getTradeByOpenOrderId = function (oid) {
    for (var ti=0, tlen=this.trades.length; ti<tlen; ++ti) {
        if (this.trades[ti].openOrderId == oid) return this.trades[ti]
    }
    return false
}

Robot.prototype.getTradeByCloseOrderId = function (oid) {
    for (var ti=0, tlen=this.trades.length; ti<tlen; ++ti) {
        //console.log('getcloseorderID', oid, ti, this.trades[ti]);
        if (this.trades[ti].closeOrderId == oid) return this.trades[ti]
    }
    return false
}

/*Robot.prototype.getTradeByContractId = function (cid) {
    for (var ti=0, tlen=this.trades.length; ti<tlen; ++ti) {
        if (this.trades[ti].contractId == cid) return this.trades[ti]
    }
    return false
}*/

Robot.prototype.Order = function(orderId) {
    if (this.opening)   {
        this.trades.push(new Trade(this.id, orderId, this.symbol))
        //console.log(this.name, 'opening order received', orderId);
    }
    else if (this.closing)   {
        // find first non-closed
        for (var ti=0, tlen=this.trades.length; ti<tlen; ++ti) {
            if (this.trades[ti].closeOrderId) continue;
            this.trades[ti].closeOrderId = orderId;
            break;
        }
        //console.log(this.name, 'closing order received');
    }
}

Robot.prototype.OpenFill = function(data) {
    var trade = this.getTradeByOpenOrderId(data.orderId);
    if (!trade) return false
    this.opening = false
    trade.Open(data)
    //console.log('dir ', this.direction);
    this.position = (this.oldposition || 0) + ((this.direction == 1) ? 1 : -1);
    //console.log('pos ', this.position);
    //console.log(this.trades);
}

Robot.prototype.CloseFill = function(data) {
    var trade = this.getTradeByCloseOrderId(data.orderId);
    if (!trade) return false
    this.closing = false
    this.trades.forEach(trade => {  // close all
        trade.Close(data)
        this.WriteDB(trade);
    });
    this.trades = []
    //console.log(this.trades);
    this.position = 0;
    if (this.stopping)  {
        this.stopping = false
        this.active = false
    }
}

Robot.prototype.Open = function () {
    //console.log(this);
    if (!this.active || this.stopping) return false
    if (this.parameters.mode == 1 && this.direction != 1  // long only
        || this.parameters.mode == 2 && this.direction != 2)  {
            this.direction = ''
            return false
        } // short only
    this.opening = true
    //console.log(this);
    var order = { 'accountId': this.env.accountId, 'action': this.direction, 'symbol': this.symbol, 'orderQty': this.lots }
    //this.ordering = true;
    tradovate.Place(order);
    this.oldposition = this.position
    this.position = ''
    return true
}

Robot.prototype.Close = function () {
    this.closing = true
    var action
    if (this.position > 0) action = 2
    else if (this.position < 0) action = 1
    tradovate.Place({ 'accountId': this.env.accountId, 'action': action, 'symbol': this.symbol, 'orderQty': Math.abs(this.position) })
    //tradovate.Place({ 'accountId': this.env.accountId, 'action': action, 'symbol': this.symbol, 'orderQty': this.lots })
    this.position = ''
    this.oldposition = 0
    this.direction = ''
}

Robot.prototype.WriteDB = function (trade) {
    //console.log(trade);
    var dir = (trade.action == 'Buy') ? 1 : 2;
    var postdata = [this.name, new Date().today(),
        this.env.accountId, this.symbol,
        trade.qty, dir,
        trade.openPrice, trade.openTime, trade.closePrice, trade.closeTime];

    //console.log(postdata);

    request.post('https://connecting.hu/trading/tradovate/logger.php', { form: { data: postdata } }, function(err, res, body) {
        if (err) { return console.log(err); }
        //console.log(res);
        if (body) { console.log('Szilankok.hu> ') ; console.log(body) }
        //this.DeleteTrade(trade)
    });
}

Robot.prototype.Delete = function (trade) {
    delete this.trades[trade.id]
    //this.trades[trade.id] = null
}

module.exports = Robot;