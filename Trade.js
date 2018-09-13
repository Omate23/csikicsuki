//var fs = require('fs');

class Trade {
    constructor(robotId, orderId) {
        this.robotId = robotId
        this.orderId = orderId
    }

    Open(trade) {
        for (var t in trade) { this[t] = trade[t] }
        this.openTime = trade.timestamp.replace(/(\d{4}-\d\d-\d\d)T(\d\d:\d\d:\d\d)\..+/, '$1 $2');
    }

    Close(trade) {
        this.closeTime = trade.timestamp.replace(/(\d{4}-\d\d-\d\d)T(\d\d:\d\d:\d\d)\..+/, '$1 $2');
        this.WriteDB();
    }

    WriteDB() {
        var dir = (this.action == 'Buy') ? 1 : 2;
        var postdata = [this.logstring, new Date().today(),
            this.accountId, this.symbol, this.orderQty, dir,
            this.openPrice, this.openTime, this.closePrice, this.closeTime]

        console.log(postdata);

        /*request.post('https://connecting.hu/trading/tradovate/logger.php', { form: { data: postdata } }, function(err, res, body) {
            if (err) { return console.log(err); }
            //console.log(res);
            if (body) { console.log('Szilankok.hu> ') ; console.log(body) }
        });*/
    }
}

module.exports = Trade;