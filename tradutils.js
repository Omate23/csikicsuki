var fs = require('fs');
var tradovate = require('./tradovate');
var control = require('./control');
// read-only vars:
var directions = control.directions
var settings = control.settings
var symbol = control.symbol


var tpc=0,slc=0;    // TP, SL counters

exports.ctrl = function() { console.log(control); }


function Close1(direction)    {  // closes with opposite market order
    control.price = 0; profit = 0
    //control.direction = ++control.direction % 2;    // alternating
    if (control.direction == 1) control.direction = 2; else if (control.direction == 2) control.direction = 1
    tradovate.Place({ 'accountId': settings.accountId, 'orderType':'Market', 'action':directions[control.direction], 'symbol':settings.symbol, 'orderQty':settings.lots })
    control.direction = 0; control.position = 0;
    //control.direction = ++control.direction % 2;    // set back
    //if (control.direction == 1) control.direction = 2; else if (control.direction == 2) control.direction = 1
}


function CloseOnTP(data, tp)    {
    var profit = GetProfit(data)
    if (profit >= tp) {
        Close1()
        Append('trader.log', "Profit!\n")
        console.log('Profit! ' + ++tpc);
    }
}
module.exports.CloseOnTP = CloseOnTP;

function CloseOnSL(data, sl)    {
    var profit = GetProfit(data)
    if (profit <= -sl) {
        Close1()
        //tradovate.Cancel({ 'orderId':orderId })     // cancels its limit
        Append('trader.log', 'Bukta!\n')
        console.log('Bukta! '  + ++slc);        
    }
}
module.exports.CloseOnSL = CloseOnSL;

function GetProfit(data) {
    var profit
    if (control.direction == 1) { // long
        profit = data.entries.Bid.price - control.price
    } else if (control.direction == 2) { // short
        profit = control.price - data.entries.Offer.price
    }
    profit = Math.round(profit / symbol.ticksize) * symbol.tickvalue
    console.log('profit: ' + profit);    
    return profit
}

function Append(file, data)    {
    var dir = './data/'
    fs.appendFile(dir+file, data, function(err) {
        if (err) { return console.log('File write error: ' + err); }
    })
}
