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
function LogQ(data, logstring) {
    this.data = data;
    this.data.logstring = logstring;
    //this.opentime = new Date() / 1000;
    //this.data.openTime = new Date() / 1000;
}

LogQ.prototype.open = function(data) {
    this.data.openPrice = data.price;
    this.data.openTime = data.timestamp.replace(/(\d{4}-\d\d-\d\d)T(\d\d:\d\d:\d\d)\..+/, '$1 $2');
    //console.log(this.data);
};

LogQ.prototype.close = function(data) {
    //console.log(data);
    this.data.closePrice = data.price;
    this.data.closeTime = data.timestamp.replace(/(\d{4}-\d\d-\d\d)T(\d\d:\d\d:\d\d)\..+/, '$1 $2');
    //this.data = Object.assign(this.data, data)
    //console.log(this.data);
    this.write();
};

LogQ.prototype.write = function()   {
    var dir = (this.data.action == 'Buy') ? 1 : 2;
    var postdata = [this.data.logstring, new Date().today(), 
        this.data.accountId, this.data.symbol, this.data.orderQty, dir,
        this.data.openPrice, this.data.openTime, this.data.closePrice, this.data.closeTime]

    request.post('https://connecting.hu/trading/tradovate/logger.php', { form: { data: postdata } }, function(err, res, body) {
        if (err) { return console.log(err); }
        //console.log(res);
        if (body) { console.log('Szilankok.hu> ') ; console.log(body) }
    });

}

module.exports = LogQ; 

// For todays date;
Date.prototype.today = function () { 
    //return ((this.getDate() < 10)?"0":"") + this.getDate() +"-"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"-"+ this.getFullYear();
    return this.getFullYear() + "-" + (((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) + "-" + ((this.getDate() < 10)?"0":"") + this.getDate();
}

// For the time now
Date.prototype.timeNow = function () {
    return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}