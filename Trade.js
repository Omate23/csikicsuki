//var fs = require('fs');

var tid = 0;

/*class Trade {

    constructor(robotId, orderId, symbol) {
        this.id = tid++
        this.robotId = robotId
        this.openOrderId = orderId
        this.symbol = symbol
    }

    Open(trade) {
        for (var t in trade) { this[t] = trade[t] }
        this.openPrice = trade.price;
        this.openTime = trade.timestamp.replace(/(\d{4}-\d\d-\d\d)T(\d\d:\d\d:\d\d)\..+/, '$1 $2');
    }

    Close(trade) {
        this.closePrice = trade.price;
        this.closeTime = trade.timestamp.replace(/(\d{4}-\d\d-\d\d)T(\d\d:\d\d:\d\d)\..+/, '$1 $2');
    }
}*/

function Trade(robotId, orderId, symbol) {
    this.id = tid++
    this.robotId = robotId
    this.openOrderId = orderId
    this.symbol = symbol
}

Trade.prototype.Open = function(trade) {
    for (var t in trade) { this[t] = trade[t] }
    this.openPrice = trade.price;
    this.openTime = trade.timestamp.replace(/(\d{4}-\d\d-\d\d)T(\d\d:\d\d:\d\d)\..+/, '$1 $2');
}

Trade.prototype.Close = function(trade) {
    this.closePrice = trade.price;
    this.closeTime = trade.timestamp.replace(/(\d{4}-\d\d-\d\d)T(\d\d:\d\d:\d\d)\..+/, '$1 $2');
}

module.exports = Trade;