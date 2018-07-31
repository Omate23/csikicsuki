#!/usr/bin/env node

var fs = require('fs');
var tradovate = require('./tradovate');
var utils = require('./tradutils');

var control = require('./control');
var directions = directions
var settings = control.settings
var symbol = control.symbol


//LOGIC:
var dom0 = 10, sumneeded = 45, countneeded = 3, signalneeded = 1;
var lc=0; sc=0; ls=0; ss=0;
var buyc=0; sellc=0;
var tp = 15, sl = 25 // in dollars




tradovate.Events.on('connected', function () {
    //console.log('conntd');
    //tradovate.Place({ 'accountId': s.accountId, 'action':control.directions[control.direction], 'symbol':s.symbol, 'orderQty':s.lots });
})

tradovate.Events.on('domchange', function (data) {
    if (control.position) {
        //console.log('control.position: ' + control.position);
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
        control.direction = 1;
        control.direction = 1;
        control.price = data[0].bids[0].price
        buyc=0; sellc=0;
    } else if (sellc >= signalneeded) {
        control.direction = 2;
        control.direction = 2;
        control.price = data[0].offers[0].price
        buyc=0; sellc=0;
    }
    if (control.direction && !control.position) {
        //tradovate.Place({ 'accountId':s.accountId, 'action':control.directions[control.direction], 'symbol':s.symbol, 'orderQty':s.lots,
        //    'orderType':'Limit', 'control.price':control.price })
        tradovate.Place({ 'accountId':settings.accountId, 'action':control.directions[control.direction],
            'symbol':settings.symbol, 'orderQty':settings.lots,
            'orderType':'Market' })

        lc=0; sc=0; ls=0; ss=0;
        buyc=0; sellc=0;
        control.position = 9999;
    }
})

tradovate.Events.on('pricechange', function (data) {
    //console.log(data);
    if (!control.position) return

    utils.CloseOnTP(data, tp)
    utils.CloseOnSL(data, sl)
        
    //console.log('dir: ' + control.direction);    
})

tradovate.Events.on('histogramchange', function (data) {
    console.log(data);
    if (!control.position) return

    utils.CloseOnTP(data, tp)
    utils.CloseOnSL(data, sl)
        
    //console.log('dir: ' + control.direction);    
})

tradovate.Events.on('fill', function (data) {
    orderId = data.orderId
    //console.log(orderId);
})

tradovate.Events.on('positionchange', function (data) {
    //console.log('==' + data.netPos);
    //console.log('dir:' + control.direction);
    control.position = data.netPos
    if (data.netPos == 0)  {
        //control.direction = ++control.direction % 2;    // alternating
        //if (control.direction == 1) control.direction = 2; else if (control.direction == 2) control.direction = 1
        //console.log(control.directions[control.direction]);
        control.price = 0
        //Append('trader.log', control.directions[control.direction] + ' ')
        //tradovate.Place({ 'accountId': s.accountId, 'orderType':'Market', 'action':control.directions[control.direction], 'symbol':s.symbol, 'orderQty':s.lots })
    }
    else if (data.netPos == 1)  {
        control.price = data.netPrice
    }
    else if (data.netPos == -1)  {
        control.price = data.netPrice
    }
    //utils.ctrl()
    //process.exit(0)
    //console.log(control.price);
});

