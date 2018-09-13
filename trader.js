#!/usr/bin/env node

var fs = require('fs');
var tradovate = require('./tradovate1');
var utils = require('./tradutils');

var symbols = JSON.parse(fs.readFileSync('./data/symbol.json', 'utf8'));
var settings = JSON.parse(fs.readFileSync('./data/settings.json', 'utf8'));

var Robot = require('./Robot');
var robots = []
var robotsfile = JSON.parse(fs.readFileSync('./data/robots.json', 'utf8'));
robotsfile.forEach(function (r) {
    if (!r.active) return;
    robots.push(new Robot(r, settings));
});
//console.log(robots);




tradovate.Events.on('connected', () => {
    robots.forEach(r => {
        for (s in r.subscriptions)  {
            if (r.subscriptions[s]) tradovate.Subscribe(s, r.symbol);
        }
    })
})

tradovate.Events.on('pricechange', function (data) {
    //console.log(data);
    Bid = data.entries.Bid.price
    Offer = data.entries.Offer.price
    //console.log('b/o', Bid, Offer);

    robots.forEach(function (r) {
        if (!r.position && !r.price)  { // initial position
            r.price = Bid
            // console.log('zeroprice: ' + r.price);
            return
        }

        if (r.price)  {
            var symbol = symbols[r.symbol]
            var besav = r.parameters.besav
            var kisav = r.parameters.kisav

            console.log(r.name, r.price, Math.round((Bid - r.price) / symbol.ticksize), 'pos:', r.position, 'dir:', r.direction);
            if (r.price == '') return

            if (r.position === 0)   {
                if ((Bid - r.price) / symbol.ticksize < -besav) r.direction = 1
                else if ((Offer - r.price) /symbol.ticksize > besav) r.direction = 2

                if (r.direction)  {
                    console.log(r.env.accountId);

                    r.Open();
                }
            }
            else if (r.position == 1)   {
                if ((Bid - r.price) / symbol.ticksize > kisav)  {
                    r.CloseAll();
                }
                else if ((Bid - r.price) / symbol.ticksize < -besav)  {
                    r.Open();
                }
            }
            else if (r.position == 2)   {
                if ((Bid - r.price) / symbol.ticksize > kisav)  {
                    r.CloseAll();
                }
                else if ((Bid - r.price) / symbol.ticksize < -kisav)  {
                    r.CloseAll();
                }
            }
            else if (r.position == -1)   {
                if ((Offer - r.price) / symbol.ticksize < -kisav)  {
                    r.CloseAll();
                }
                else if ((Offer - r.price) / symbol.ticksize > besav)  {
                    r.Open();
                }
            }
            else if (r.position == -2)   {
                if ((Offer - r.price) / symbol.ticksize < -kisav)  {
                    r.CloseAll();
                }
                else if ((Offer - r.price) / symbol.ticksize > kisav)  {
                    r.CloseAll();
                }
            }
        }
        //console.log('dir: ' + r.direction);
    })
})

tradovate.Events.on('order', function (data) {   // order received
    // console.log(data);
    for (r=0, len=robots.length; r<len; ++r) {
        if (robots[r].ordering) {
            robots[r].ordering = false
            robots[r].Order(data.orderId)
            break
        }
    }
})

tradovate.Events.on('fill', function (data) {
    console.log(data);
    for (var ri=0, rlen=robots.length; ri<rlen; ++ri) {
        if (robots[ri].getTradeByOrderId(data.orderId))  {
            var r = robots[ri];
            break;
        }
    }
    console.log(r);
    if (!r) console.log(robots);
    

    r.price = data.price

    if (r.direction)  {     // opening fill
        /*logq[logqOpened++].open(data);
        console.log(logq);*/
        r.OpenFill(data);
    } else {                // closing fill
        while (data.qty--)   {
            r.Filled(data);
            //logq[logqClosed++].close(data);
        }
        /*console.log(logq);
        logq = []; logqOpened = 0; logqClosed = 0;
        console.log(logq);*/
    }
    //console.log(logq);


    /*if (contractId && contractId == data.contractId)    {
        contractId = 0;
        //var closePrice = (r.direction == 1) ? Offer : Bid;
        //utils.Log([data.price, new Date().timeNow()])
    } else {
        contractId = data.contractId
    }*/
})

tradovate.Events.on('positionchange', function (data) {
    console.log('posc');
    console.log(data);
    for (var ri=0, rlen=robots.length; ri<rlen; ++ri) {
        if (robots[ri].getTradeByContractId(data.contractId))  {
            var r = robots[ri];
            break;
        }
    }
    r.position = data.netPos
    if (data.netPos == 0)  {
        //console.log(data);
        //r.direction = ++r.direction % 2;    // alternating
        //if (r.direction == 1) r.direction = 2; else if (r.direction == 2) r.direction = 1
        //console.log(r.directions[r.direction]);
        //Append('trader.log', r.directions[r.direction] + ' ')
        //tradovate.Place({ 'accountId': s.accountId, 'orderType':'Market', 'action':r.directions[r.direction], 'symbol':s.symbol, 'orderQty':s.lots })
    }
    else if (data.netPos == 1)  {
    }
    else if (data.netPos == -1)  {
    }
    /*if (Math.abs(data.netPos) > 1)    {
        r.price = data.netPrice
        //utils.Log([settings.logstring, new Date().today(), settings.accountId, settings.symbol, settings.lots, directions[r.direction], r.price, new Date().timeNow()])
    }*/
    if (data.netPos)    {
        //r.price = data.netPrice
        //utils.Log([settings.logstring, new Date().today(), settings.accountId, settings.symbol, settings.lots, directions[r.direction], r.price, new Date().timeNow()])
    }
    //console.log(r);
    //process.exit(0)

});

/*
function Market()   {
    var order = { 'accountId': settings.accountId, 'action':r.directions[r.direction], 'symbol':settings.symbol, 'orderQty':settings.lots }
    tradovate.Place(order);
    r.position = ''
    var logstring = [settings.logstring, besav, kisav].join('-');
    logq[logqOpened] = new LogQ(order, logstring);
}
*/
