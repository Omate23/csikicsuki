#!/usr/bin/env node

var fs = require('fs');

var tradovate = require('./tradovate');
var directions = ['Buy','Sell'];
var direction = 1
var price, profit
var b=0, p=0

var dir = './data/';
var s = JSON.parse(fs.readFileSync(dir+'settings.json', 'utf8'));

tradovate.Events.on('connected', function () {
    console.log('conntd');
    tradovate.Place({ 'accountId': s.accountId, 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots })
})

tradovate.Events.on('price', function (data) {
    //console.log(data);
    
    if (!price) return
    if (!direction) { // long
        profit = data.entries.Bid.price - price
    } else { // short
        profit = price - data.entries.Offer.price
    }
    //console.log(profit);    
    if (profit > 1.5) {
        Append('easio.log', "Profit!\n")
        console.log('Profit! ' + ++p);        
        Closez()
    }
    else if (profit < -2.5) {
        Append('easio.log', 'Bukta!\n')
        console.log('Bukta! ' + ++b);        
        Closez()
    }
})


tradovate.Events.on('positionchange', function (data) {
    console.log('==' + position);
    //console.log('dir:' + direction);
    if (data.netPos == 0)  {
        direction = ++direction % 2;    // alternating
        console.log(directions[direction]);
        Append('easio.log', directions[direction] + ' ')
        tradovate.Place({ 'accountId': s.accountId, 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots })
    }
    else if (data.netPos == 1)  {
        price = data.netPrice
        tradovate.PlaceOCO({
            //"accountSpec": "string",
            "accountId": s.accountId,
            //"clOrdId": "string",
            "action": "Sell",
            "symbol": s.symbol,
            "orderQty": 1,
            "orderType": "Limit",
            "price": price + 1,
            //"stopPrice": price - 2,
            //"maxShow": 0,
            //"pegDifference": 0,
            //"text": "string",
            //"activationTime": "2018-01-22T10:35:33.355Z",
            "other": {
                "action": "Sell",
                //"clOrdId": "string",
                "orderType": "Stop",
                "price": price - 2,
                "expireTime": '2018-07-17T13:17:39.750Z',
                "timeInForce": "GTD",
                //"stopPrice": price - 2,
                //"maxShow": 0,
                //"pegDifference": 0,
                //"text": "string"
            }
        })
    }
    else if (data.netPos == -1)  {
        price = data.netPrice
        tradovate.PlaceOCO({
            //"accountSpec": "string",
            "accountId": s.accountId,
            //"clOrdId": "string",
            "action": "Buy",
            "symbol": s.symbol,
            "orderQty": 1,
            "orderType": "Limit",
            "price": price - 1,
            //"stopPrice": price - 2,
            //"maxShow": 0,
            //"pegDifference": 0,
            //"text": "string",
            //"activationTime": "2018-01-22T10:35:33.355Z",
            "other": {
                "action": "Sell",
                //"clOrdId": "string",
                "orderType": "Stop",
                "price": price - 2,
                "expireTime": '2018-07-17T13:17:39.750Z',
                "timeInForce": "GTD",
                //"stopPrice": price - 2,
                //"maxShow": 0,
                //"pegDifference": 0,
                //"text": "string"
            }
        })
    }
    console.log(price);
});


function Closez()    {
    price = 0; profit = 0
    direction = ++direction % 2;    // alternating
    tradovate.Place({ 'accountId': s.accountId, 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots })
    direction = ++direction % 2;    // set back
}

function Append(file, data)    {
    var dir = './data/'
    fs.appendFile(dir+file, data, function(err) {
        if (err) { return console.log('File write error: ' + err); }
    })
}

