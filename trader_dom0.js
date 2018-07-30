#!/usr/bin/env node

var fs = require('fs');

var tradovate = require('./tradovate');
var directions = ['','Buy','Sell'];
var direction = 0
var price=0, profit=0, position=0

var dir = './data/';
var s = JSON.parse(fs.readFileSync(dir+'settings.json', 'utf8'));

var orderId
var tickvalue = 5
var ticksize = 0.25//0.00005
var tp = 15, sl = 25 // in dollars

var dom0 = 10, sumneeded = 45, countneeded = 3, signalneeded = 2
var lc=0; sc=0; ls=0; ss=0;
var buyc=0; sellc=0;

var p=0,b=0


tradovate.Events.on('connected', function () {
    //console.log('conntd');
    //tradovate.Place({ 'accountId': s.accountId, 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots });
})

tradovate.Events.on('domchange', function (data) {
    if (position) {
        //console.log('position: ' + position);
        return
    }
    if (data[0].bids[0].size >= dom0)  {
        console.log('b ' + data[0].bids[0].size);
        lc++; sc=0; ss=0;
        ls += data[0].bids[0].size

        if (ls >= sumneeded && lc >= countneeded)  {
            lc=0; sc=0; ls=0; ss=0;
            buyc++; sellc=0;
            console.log('Buy! ' + buyc);
        }
    }
    if (data[0].offers[0].size >= dom0)    {
        console.log('o ' + data[0].offers[0].size);
        sc++; lc=0; ls=0;
        ss += data[0].offers[0].size

        if (ss >= sumneeded && sc >= countneeded)  {
            lc=0; sc=0; ls=0; ss=0;
            buyc=0; sellc++;
            console.log('Sell! ' + sellc);        
        }
    }

    if (buyc >= signalneeded) {
        direction = 1;
        price = data[0].bids[0].price
        buyc=0; sellc=0;
    } else if (sellc >= signalneeded) {
        direction = 2;
        price = data[0].offers[0].price
        buyc=0; sellc=0;
    }
    if (direction && !position) {
        //tradovate.Place({ 'accountId':s.accountId, 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots,
        //    'orderType':'Limit', 'price':price })
        tradovate.Place({ 'accountId':s.accountId, 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots,
            'orderType':'Market' })

        lc=0; sc=0; ls=0; ss=0;
        buyc=0; sellc=0;
        position = 9999;
    }
})

tradovate.Events.on('pricechange', function (data) {
    //console.log(data);
    if (!position) return
        
    //console.log('dir: ' + direction);    
    if (direction == 1) { // long
        profit = data.entries.Bid.price - price
    } else if (direction == 2) { // short
        profit = price - data.entries.Offer.price
    }
    profit = Math.round(profit / ticksize) * tickvalue
    console.log('profit: ' + profit);    
    //return
    if (profit >= tp) {
        Closez()
        Append('trader.log', "Profit!\n")
        console.log('Profit! ' + 'dir:' + direction + ' ' + ++p);        
    }
    else if (profit < -sl) {
        Closez()                                    // closes with opposite market order
        //tradovate.Cancel({ 'orderId':orderId })     // cancels its limit
        Append('trader.log', ' bukta!')
        console.log('Bukta! '  + 'dir:' + direction + ' ' + ++b);        
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
        //direction = ++direction % 2;    // alternating
        //if (direction == 1) direction = 2; else if (direction == 2) direction = 1
        //console.log(directions[direction]);
        price = 0
        //Append('trader.log', directions[direction] + ' ')
        //tradovate.Place({ 'accountId': s.accountId, 'orderType':'Market', 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots })
    }
    else if (data.netPos == 1)  {
        price = data.netPrice
        return
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
        return
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
    //direction = ++direction % 2;    // alternating
    if (direction == 1) direction = 2; else if (direction == 2) direction = 1
    tradovate.Place({ 'accountId': s.accountId, 'orderType':'Market', 'action':directions[direction], 'symbol':s.symbol, 'orderQty':s.lots })
    direction = 0; position = 0;
    //direction = ++direction % 2;    // set back
    //if (direction == 1) direction = 2; else if (direction == 2) direction = 1
}

function Append(file, data)    {
    var dir = './data/'
    fs.appendFile(dir+file, data, function(err) {
        if (err) { return console.log('File write error: ' + err); }
    })
}

