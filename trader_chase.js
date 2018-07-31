#!/usr/bin/env node

var fs = require('fs');

var tradovate = require('./tradovate');
var directions = ['Buy','Sell'];
var direction = 1
var price=0, profit=0, position=0
var b=0, p=0

var orderId
var follow = .25
var tp = .5
var sl = 1

var dir = './data/';
var s = JSON.parse(fs.readFileSync(dir+'settings.json', 'utf8'));

tradovate.Events.on('connected', function () {
    //console.log('conntd');
    //tradovate.Place({ 'accountId': s.accountId, 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots });
})

tradovate.Events.on('pricechange', function (data) {
    //console.log(data);
    
    if (!position) {
        if (!price) {
            if (!direction) { // long
                price = data.entries.Bid.price - follow
            } else { // short
                price = data.entries.Offer.price + follow
            }    
            tradovate.Place({ 'accountId':s.accountId, 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots,
                'orderType':'Limit', 'price':price })
        } else {
            var distance
            if (!direction) distance = data.entries.Bid.price - price
            else distance = price - data.entries.Offer.price
            if (distance > follow) {
                if (!direction) price = data.entries.Bid.price - follow
                else price = data.entries.Offer.price + follow
                tradovate.Modify({ 'orderId':orderId, 'orderQty':s.lots, 'orderType':'Limit', 'price':price })
            }
            //console.log(distance, direction);            
        }
        return
    }

    if (!direction) { // long
        profit = data.entries.Bid.price - price
    } else { // short
        profit = price - data.entries.Offer.price
    }
    //console.log(profit);    
    if (profit >= tp) {
        /*
        Append('trader.log', "Profit!\n")
        console.log('Profit! ' + ++p);        
        Closez()
        */
    }
    else if (profit < -sl) {
        Append('trader.log', ' bukta!')
        console.log('Bukta! ' + ++b);        
        Closez()                                    // closes with opposite market order
        tradovate.Cancel({ 'orderId':orderId })     // cancels its limit
    }
})

tradovate.Events.on('fill', function (data) {
    orderId = data.orderId
    //console.log(orderId);
})

tradovate.Events.on('positionchange', function (data) {
    //console.log('==' + data.netPos);
    //console.log('dir:' + direction);
    position = data.netPos
    if (data.netPos == 0)  {
        direction = ++direction % 2;    // alternating
        console.log(directions[direction]);
        price = 0
        //Append('trader.log', directions[direction] + ' ')
        //tradovate.Place({ 'accountId': s.accountId, 'orderType':'Market', 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots })
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
            "price": price + tp,
            //"stopPrice": price - 2,
            //"maxShow": 0,
            //"pegDifference": 0,
            //"text": "string",
            //"activationTime": "2018-01-22T10:35:33.355Z",
            "other": {
                "action": "Sell",
                //"clOrdId": "string",
                "orderType": "Stop",
                "price": price - sl,
                "expireTime": '2018-07-17T13:17:39.750Z',
                "timeInForce": "GTD",
                //"stopPrice": price - 2,
                //"maxShow": 0,
                //"pegDifference": 0,
                //"text": "string"
            }
        })
        Append('trader.log', '\nLong')
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
            "price": price - tp,
            //"stopPrice": price - 2,
            //"maxShow": 0,
            //"pegDifference": 0,
            //"text": "string",
            //"activationTime": "2018-01-22T10:35:33.355Z",
            "other": {
                "action": "Sell",
                //"clOrdId": "string",
                "orderType": "Stop",
                "price": price - sl,
                "expireTime": '2018-07-17T13:17:39.750Z',
                "timeInForce": "GTD",
                //"stopPrice": price - 2,
                //"maxShow": 0,
                //"pegDifference": 0,
                //"text": "string"
            }
        })
        Append('trader.log', '\nShort')
    }
    //console.log(price);
});


function Closez()    {
    price = 0; profit = 0
    direction = ++direction % 2;    // alternating
    tradovate.Place({ 'accountId': s.accountId, 'orderType':'Market', 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots })
    direction = ++direction % 2;    // set back
}

function Append(file, data)    {
    var dir = './data/'
    fs.appendFile(dir+file, data, function(err) {
        if (err) { return console.log('File write error: ' + err); }
    })
}

