var fs = require('fs');
var request = require('request');
//var tradovate = require('./tradovate');
var control = require('./control');

// read-only vars:
var directions = control.directions
var settings = control.settings
var symbol = control.symbol

var today
var timeNow
var logbits = []

var tpc=0,slc=0;    // TP, SL counters

exports.ctrl = function() { console.log(control); }


function Close1()    {  // closes with opposite market order
    control.price = 0;
    control.position = '';
    //control.direction = ++control.direction % 2;    // alternating
    if (control.direction == 1) control.direction = 2; else if (control.direction == 2) control.direction = 1
    tradovate.Place({ 'accountId': settings.accountId, 'orderType':'Market', 'action':directions[control.direction], 'symbol':settings.symbol, 'orderQty':settings.lots })
    control.direction = 0; 
    //control.direction = ++control.direction % 2;    // set back
    //if (control.direction == 1) control.direction = 2; else if (control.direction == 2) control.direction = 1
}

function CloseOnTP(data, tp)    {
    var profit = GetProfit(data)
    if (profit >= tp) {
        Close1()
        Append('trader.log', "Kasza!\n")
        console.log('Kasza! ' + ++tpc);
    }
}
module.exports.CloseOnTP = CloseOnTP;

function CloseOnSL(data, sl)    {
    var profit = GetProfit(data)
    if (profit <= -sl) {
        //Log([new Date().timeNow(), control.price].join(';') + "\n")
        Close1()
        //tradovate.Cancel({ 'orderId':orderId })     // cancels its limit
        Append('trader.log', 'Bukta!\n')
        console.log('Bukta! '  + ++slc);  
    }
}
module.exports.CloseOnSL = CloseOnSL;

function CloseAll() {
    if (control.position > 0)   {
        tradovate.Place({ 'accountId': settings.accountId, 'orderType':'Market', 'action':directions[2], 'symbol':settings.symbol, 'orderQty':control.position })
    }
    else if (control.position < 0)   {
        tradovate.Place({ 'accountId': settings.accountId, 'orderType':'Market', 'action':directions[1], 'symbol':settings.symbol, 'orderQty':-control.position })
    }
    control.position = ''
    control.direction = ''
    //console.log(control);
}
module.exports.CloseAll = CloseAll;

function GetProfit(data) {
    var profit
    //console.log(data);
    //console.log(control);
    //process.exit    
    
    if (control.direction == 1) { // long
        profit = data.entries.Bid.price - control.price
    } else if (control.direction == 2) { // short
        profit = control.price - data.entries.Offer.price
    }
    profit = Math.round(profit / symbol.ticksize) * symbol.tickvalue
    // console.log('profit: ' + profit);    
    return profit
}

function Append(file, data)    {
    var dir = './data/'
    fs.appendFile(dir+file, data, function(err) {
        if (err) { return console.log('File write error: ' + err); }
    })
}

function Log(arr)  {
return
    //var utc = new Date().toJSON().slice(0,10).replace(/-/g,'-');    
    if (!today) today = new Date().today()
    logbits = logbits.concat(arr)
    
    if (logbits.length == 10)   {   // entry complete
        var logrow = logbits.join(';')
        Append([settings.logstring, today].join('_') + '.log', logrow + '\n')
        request.post('https://connecting.hu/trading/tradovate/logger.php', { form: { data: logrow } }, function(err, res, body) {
            if (err) { return console.log(err); }
            //console.log(res);
            if (body) { console.log('Szilankok.hu> ') ; console.log(body) }
        });
        logbits = []
    }
    console.log(logbits.length);
    
}
module.exports.Log = Log;



// For todays date;
Date.prototype.today = function () { 
    //return ((this.getDate() < 10)?"0":"") + this.getDate() +"-"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"-"+ this.getFullYear();
    return this.getFullYear() + "-" + (((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) + "-" + ((this.getDate() < 10)?"0":"") + this.getDate();
}

// For the time now
Date.prototype.timeNow = function () {
     return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}

