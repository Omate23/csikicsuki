#!/usr/bin/env node

var fs = require('fs');
var tradovate = require('./tradovate');
var utils = require('./tradutils');
var LogQ = require('./LogQ');

var control = require('./control');
var directions = control.directions
var settings = control.settings
var symbol = control.symbol
var orderId, contractId
var logq = []; logqOpened = 0; logqClosed = 0;


//LOGIC:
var kisav = 5; besav = 9;

//ACTION:




tradovate.Events.on('connected', function () {
    //console.log('conntd');
    //tradovate.Place({ 'accountId': settings.accountId, 'action':control.directions[control.direction], 'symbol':settings.symbol, 'orderQty':settings.lots });
})

tradovate.Events.on('pricechange', function (data) {
    //console.log(data);
    Bid = data.entries.Bid.price
    Offer = data.entries.Offer.price
    //console.log('b/o', Bid, Offer);

    if (!control.position && !control.price)  {
        control.price = Bid
        // console.log('zeroprice: ' + control.price);
        return
    }

    if (control.price)  {
        //utils.CloseOnTP(data, tp)
        //utils.CloseOnSL(data, sl)
        console.log(control.price, (Bid - control.price ) / symbol.ticksize, control.position);
        if (control.price == '') return
        
        if (control.position === 0)   {
            if ((Bid - control.price) / symbol.ticksize < -besav) control.direction = 1
            else if ((Offer - control.price) / symbol.ticksize > besav) control.direction = 2

            if (control.direction)  {
                //console.log(control.direction);
                Market()
            }
        }
        else if (control.position == 1)   {
            if ((Bid - control.price) / symbol.ticksize > kisav)  {
                utils.CloseAll()
            }
            else if ((Bid - control.price) / symbol.ticksize < -besav)  {
                Market()
            }
        }
        else if (control.position == 2)   {
            if ((Bid - control.price) / symbol.ticksize > kisav)  {
                utils.CloseAll()
            }
            else if ((Bid - control.price) / symbol.ticksize < -kisav)  {
                utils.CloseAll()
            }
        }
        else if (control.position == -1)   {
            if ((Offer - control.price) / symbol.ticksize < -kisav)  {
                utils.CloseAll()
            }
            else if ((Offer - control.price) / symbol.ticksize > besav)  {
                Market()
            }
        }
        else if (control.position == -2)   {
            if ((Offer - control.price) / symbol.ticksize < -kisav)  {
                utils.CloseAll()
            }
            else if ((Offer - control.price) / symbol.ticksize > kisav)  {
                utils.CloseAll()
            }
        }
    }
    //console.log('dir: ' + control.direction);    
})

tradovate.Events.on('fill', function (data) {
    orderId = data.orderId
    //console.log(orderId);
    //var closePrice = (control.direction == 1) ? Offer : Bid;
    // utils.Log([closePrice, new Date().timeNow()].join(';') + "\n")

})

tradovate.Events.on('fillevent', function (data) {
    //console.log(data);
    control.price = data.price

    if (control.direction)  {
        logq[logqOpened++].open(data);
        console.log(logq);
    } else {
        while (data.qty--)   {
            logq[logqClosed++].close(data);
        }
        console.log(logq);
        logq = []; logqOpened = 0; logqClosed = 0;
        console.log(logq);
    }
    //console.log(logq);
    

    /*if (contractId && contractId == data.contractId)    {
        contractId = 0;
        //var closePrice = (control.direction == 1) ? Offer : Bid;
        //utils.Log([data.price, new Date().timeNow()])
    } else {
        contractId = data.contractId
    }*/
})

tradovate.Events.on('positionchange', function (data) {
    //console.log(data);    
    //console.log('==' + data.netPos);
    //console.log('dir:' + control.direction);
    control.position = data.netPos
    if (data.netPos == 0)  {
        //console.log(data);
        //control.direction = ++control.direction % 2;    // alternating
        //if (control.direction == 1) control.direction = 2; else if (control.direction == 2) control.direction = 1
        //console.log(control.directions[control.direction]);
        //Append('trader.log', control.directions[control.direction] + ' ')
        //tradovate.Place({ 'accountId': s.accountId, 'orderType':'Market', 'action':control.directions[control.direction], 'symbol':s.symbol, 'orderQty':s.lots })
    }
    else if (data.netPos == 1)  {
    }
    else if (data.netPos == -1)  {
    }
    /*if (Math.abs(data.netPos) > 1)    {
        control.price = data.netPrice
        //utils.Log([settings.logstring, new Date().today(), settings.accountId, settings.symbol, settings.lots, directions[control.direction], control.price, new Date().timeNow()])
    }*/
    if (data.netPos)    {
        //control.price = data.netPrice
        //utils.Log([settings.logstring, new Date().today(), settings.accountId, settings.symbol, settings.lots, directions[control.direction], control.price, new Date().timeNow()])
    }
    //console.log(control);
    //process.exit(0)
    
});


function Market()   {
    var order = { 'accountId': settings.accountId, 'action':control.directions[control.direction], 'symbol':settings.symbol, 'orderQty':settings.lots }
    tradovate.Place(order);
    control.position = ''
    logq[logqOpened] = new LogQ(order, settings.logstring);
}

