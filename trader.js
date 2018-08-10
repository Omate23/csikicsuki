#!/usr/bin/env node

var fs = require('fs');
var tradovate = require('./tradovate');
var utils = require('./tradutils');
var Level = require('./Level');

var control = require('./control');
var directions = control.directions
var settings = control.settings
var symbol = control.symbol
var orderId, contractId

//LOGIC:
var tp = 20, sl = 30 // in dollars
var base = 0;
var garbageTime = 20;   // clears "recent" volume changes
var bulls=0, bears=0
var Bid, Offer
var levels = []

//ACTION:
var diff = 1.2, larger=100, smaller=50




tradovate.Events.on('connected', function () {
    //console.log('conntd');
    //tradovate.Place({ 'accountId': s.accountId, 'action':control.directions[control.direction], 'symbol':s.symbol, 'orderQty':s.lots });
})

tradovate.Events.on('domchange', function (data) {
    if (control.position) {
        //console.log('control.position: ' + control.position);
        return
    }

    //console.log(control);
    

    if (control.direction && !control.position) {
        //tradovate.Place({ 'accountId':s.accountId, 'action':control.directions[control.direction], 'symbol':s.symbol, 'orderQty':s.lots,
        //    'orderType':'Limit', 'control.price':control.price })
        tradovate.Place({ 'accountId':settings.accountId, 'action':directions[control.direction],
            'symbol':settings.symbol, 'orderQty':settings.lots,
            'orderType':'Market' })
        //process.exit()
        control.position = 'x';
        bears=0; bulls=0;
        levels.forEach(function (l,i) { levels[i].clearRecent() })
    }
})

tradovate.Events.on('pricechange', function (data) {
    //console.log(data);
    Bid = data.entries.Bid.price
    Offer = data.entries.Offer.price
    //console.log('b/o', Bid, Offer);
    
    if (!control.position) return

    if (control.price)  {
        utils.CloseOnTP(data, tp)
        utils.CloseOnSL(data, sl)
    }
    //console.log('dir: ' + control.direction);    
})

tradovate.Events.on('histogramchange', function (data) {
    if (data.refresh) {     // INITIAL
        base = data.base
        for (var k in data.items) {
            levels.push(new Level(k, data.items[k]))
        }
    } else {    // UPDATES
        //console.log(data.items);
        //console.log('B/O', Bid, Offer);
        var found = false
        var price
        var bid = Bid, offer = Offer
        for (var k in data.items) {
            bears=0; bulls=0;
            levels.forEach(function (l,i) {
                if (levels[i].recentBid + levels[i].recentOffer > 0
                    && levels[i].time < new Date() / 1000 - garbageTime) {
                    //console.log('clear: ' + levels[i].offset);                    
                    levels[i].clearRecent()
                }

                if (l.offset == k) {    // current found
                    found = true
                    price = base + l.offset * symbol.ticksize

                    if (!control.position && price == bid) {
                        levels[i].updateBid(data.items[k])
                        // console.log('b', Bid, levels[i].recentBid);
                    }
                    else if (!control.position && price == offer) {
                        levels[i].updateOffer(data.items[k])
                        // console.log('o', Offer, levels[i].recentOffer);
                    }
                    else {
                        levels[i].update(data.items[k])
                        // console.log('other', levels[i].offset);
                    }
                }

                if (!control.position)  {
                    bulls += levels[i].recentBid
                    bears += levels[i].recentOffer
                }

            })
            if (!found) {
                levels.push(new Level(k, data.items[k]))
            }
        }
        console.log(bulls, bears, bulls-bears);

        if (bulls > bears * diff && bulls>larger && bears>smaller) {
            control.direction = 2
            console.log('sell!');
            /*tradovate.Place({ 'accountId':settings.accountId, 'action':control.directions[control.direction],
                'symbol':settings.symbol, 'orderQty':settings.lots,
                'orderType':'Market' })*/
        }
        if (bears > bulls * diff && bears>larger && bulls>smaller) {
            control.direction = 1
            console.log('buy!');
            /*tradovate.Place({ 'accountId':settings.accountId, 'action':control.directions[control.direction],
                'symbol':settings.symbol, 'orderQty':settings.lots,
                'orderType':'Market' })*/
        }
    }
})

tradovate.Events.on('fill', function (data) {
    orderId = data.orderId
    //console.log(orderId);
    //var closePrice = (control.direction == 1) ? Offer : Bid;
    // utils.Log([closePrice, new Date().timeNow()].join(';') + "\n")

})

tradovate.Events.on('fillevent', function (data) {
    //console.log(data);    
    if (contractId && contractId == data.contractId)    {
        contractId = 0;
        //var closePrice = (control.direction == 1) ? Offer : Bid;
        utils.Log([data.price, new Date().timeNow()])
    } else {
        contractId = data.contractId
    }
})

tradovate.Events.on('positionchange', function (data) {
    //console.log('==' + data.netPos);
    //console.log('dir:' + control.direction);
    control.position = data.netPos
    if (data.netPos == 0)  {
        //console.log(data);
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
    if (Math.abs(data.netPos) == 1)    {
        utils.Log([settings.logstring, new Date().today(), settings.accountId, settings.symbol, settings.lots, directions[control.direction], control.price, new Date().timeNow()])
    }
    //console.log(control);
    //process.exit(0)
    
});


// For todays date;
Date.prototype.today = function () { 
    //return ((this.getDate() < 10)?"0":"") + this.getDate() +"-"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"-"+ this.getFullYear();
    return this.getFullYear() + "-" + (((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) + "-" + ((this.getDate() < 10)?"0":"") + this.getDate();
}

// For the time now
Date.prototype.timeNow = function () {
    return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}