#!/usr/bin/env node

var fs = require('fs');
var request = require('request');
var tradovate = require('./tradovate1');
var utils = require('./tradutils');
var pricelogger = require('./TimeAndSalesLogger');

var symbols = JSON.parse(fs.readFileSync('./data/symbol.json', 'utf8'));
var settings = JSON.parse(fs.readFileSync('./data/settings.json', 'utf8'));

var Robot = require('./Robot');
var robots = []
var robotsfile = '';    // config object
var robotsconfig = '';      // config in json
/*
//var robotsfile = JSON.parse(fs.readFileSync('./data/robots.json', 'utf8'));
var robotsfile = JSON.parse(fs.readFileSync('./data/robots.slow.json', 'utf8'));
//var robotsfile = JSON.parse(fs.readFileSync('./data/robots.test.json', 'utf8'));
robotsfile.forEach(function (r) {
    if (!r.active) return;
    robots.push(new Robot(r, settings));
});
//console.log(robots);
*/

var orderQueue = [];
var lastToLog = [];     // console.log uses


var configTimer = setInterval(() => {
    RobotsConfig();
    //console.log('timer')
}, 3000)


tradovate.Events.on('connected', () => {
    RobotsConfig();
})

tradovate.Events.on('pricechange', function (data) {
    //console.log(data);
    Bid = data.entries.Bid.price
    Offer = data.entries.Offer.price
    //console.log('b/o', Bid, Offer);

    pricelogger.Log(data);  // for kalinas

    var logsep = false

    robots.forEach(function (r) {
        if (!r.active || r.stopping) return
        if (!r.position && !r.price)  { // initial position
            r.price = data.entries.Trade.price
            return
        }

        if (r.price)  {
            var symbol = symbols[r.symbol.slice(0,-2)]
            var besav = r.parameters.besav
            var kisav = r.parameters.kisav

            var loga = [r.price, Math.round((Bid - r.price) / symbol.ticksize), 'pos:', r.position, 'dir:', r.direction]
            var logid = loga.join()
            if (lastToLog[r.name] != logid)  {
                if (!logsep) { console.log('---'); logsep = true; }
                lastToLog[r.name] = logid
                loga.unshift(r.name)

                if (r.direction == 1)   {
                    var positionValue = (Bid - r.price) / symbol.ticksize * symbol.tickvalue * r.position
                }
                else if (r.direction == 2)   {
                    var positionValue = (Offer - r.price) / symbol.ticksize * symbol.tickvalue * r.position
                }
                if (positionValue) loga.push(positionValue+'$');
                else if (positionValue == 0) loga.push('0$');

                console.log(loga.join("\t"));
                //console.log(lastToLog);
            }

            if (r.price == '') return

            if (r.position === 0)   {
                if ((Bid - r.price) / symbol.ticksize < -besav) r.direction = 1
                else if ((Offer - r.price) /symbol.ticksize > besav) r.direction = 2

                if (r.direction)  {
                    orderQueue.push(r.id)
                    if (!r.Open()) { orderQueue.pop(); r.price = Bid; }
                    console.log(orderQueue);
                }
            }
            else if (r.position == 1)   {
                if ((Bid - r.price) / symbol.ticksize > kisav)  {
                    orderQueue.push(r.id)
                    r.Close();
                }
                else if ((Bid - r.price) / symbol.ticksize < -besav)  {
                    orderQueue.push(r.id)
                    if (!r.Open()) { orderQueue.pop(); r.price = Bid; }
                    console.log(orderQueue);
                }
            }
            else if (r.position == 2)   {
                if ((Bid - r.price) / symbol.ticksize > kisav)  {
                    orderQueue.push(r.id)
                    r.Close();
                }
                else if ((Bid - r.price) / symbol.ticksize < -kisav)  {
                    orderQueue.push(r.id)
                    r.Close();
                }
            }
            else if (r.position == -1)   {
                if ((Offer - r.price) / symbol.ticksize < -kisav)  {
                    orderQueue.push(r.id)
                    r.Close();
                }
                else if ((Offer - r.price) / symbol.ticksize > besav)  {
                    orderQueue.push(r.id)
                    if (!r.Open()) { orderQueue.pop(); r.price = Bid; }
                    console.log(orderQueue);
                }
            }
            else if (r.position == -2)   {
                if ((Offer - r.price) / symbol.ticksize < -kisav)  {
                    orderQueue.push(r.id)
                    r.Close();
                }
                else if ((Offer - r.price) / symbol.ticksize > kisav)  {
                    orderQueue.push(r.id)
                    r.Close();
                }
            }
        }
        //console.log('dir: ' + r.direction);
    })
})

tradovate.Events.on('order', function (data) {   // order received
    //console.log(data);
    //console.log(orderQueue);
    var owner = orderQueue.shift();
    if (owner > -1)    {
        robots[owner].Order(data.orderId)
    }
    else console.log('no owner for order');
    //console.log(orderQueue);
})

tradovate.Events.on('fill', function (data) {
    //console.log(data);

    // find closing trade
    for (var ri=0, rlen=robots.length; ri<rlen; ++ri) {
        if (robots[ri].getTradeByCloseOrderId(data.orderId))  {
            var r = robots[ri];
            console.log('closing', r.name);
            //console.log(r.trades);
            r.CloseFill(data);
            break;
        }
    }

    // or find opening order
    if (!r) {
        for (var ri=0, rlen=robots.length; ri<rlen; ++ri) {
            if (robots[ri].getTradeByOpenOrderId(data.orderId))  {
                var r = robots[ri];
                console.log('opening', r.name);
                //console.log(r.trades);
                r.OpenFill(data);
                break;
            }
        }
    }
    if (!r) console.log('no robot found for fill');


    r.price = data.price

    if (r.direction)  {     // opening fill
        /*logq[logqOpened++].open(data);
        console.log(logq);*/
        //r.OpenFill(data);
    } else {                // closing fill
        while (data.qty--)   {
            //r.CloseFill(data);
            //r.closing = false

            //logq[logqClosed++].close(data);
        }
        /*console.log(logq);
        logq = []; logqOpened = 0; logqClosed = 0;
        console.log(logq);*/
    }
    //console.log(logq);

    //console.log(r.trades);

    /*if (contractId && contractId == data.contractId)    {
        contractId = 0;
        //var closePrice = (r.direction == 1) ? Offer : Bid;
        //utils.Log([data.price, new Date().timeNow()])
    } else {
        contractId = data.contractId
    }*/
})

tradovate.Events.on('positionchange', function (data) {
return
    console.log('posc');
    //console.log(data);
    for (var ri=0, rlen=robots.length; ri<rlen; ++ri) {
        if (robots[ri].getTradeByContractId(data.contractId))  {
            var r = robots[ri];
            break;
        }
    }
    console.log(r.name);

    r.position += parseInt(data.netPos - data.prevPos)

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

function RobotsConfig() {
    request.get('https://connecting.hu/trading/tradovate/robots.php', function (error, response, body) {
        var newconfig = body;
        if (!robotsconfig)    {   // init robots
            robotsconfig = newconfig
            robotsfile = JSON.parse(robotsconfig);
            console.log('initrobs');
            robotsfile.forEach(function (r) {
                //if (!r.active) return;
                robots.push(new Robot(r, settings));
            });
            robots.forEach(r => {
                for (s in r.subscriptions)  {
                    if (r.subscriptions[s]) tradovate.Subscribe(s, r.symbol);
                }
            })

        }
        else if (robotsconfig != newconfig) {
            robotsconfig = newconfig
            robotsfile = JSON.parse(robotsconfig);
            console.log('newrobs');

            robotsfile.forEach(function (nr) {
                robots.forEach(function (r) {
                    if (nr.id == r.id)  {
                        if (r.active && !nr.active) {   // stop robot
                            console.log(r.name, 'stopping');
                            if (!r.trades.length)   {
                                console.log(r.name, 'stopped');
                                r.active = false
                            } else {
                                r.stopping = true
                                orderQueue.push(r.id)
                                r.Close();
                            }
                        }
                        if (!r.active && nr.active) {   // start robot
                            console.log(r.name, 'started');
                            r.price = ''
                            r.active = true
                        }
                        r.parameters = nr.parameters
                    }
                });
            });
        }
        //console.log(robots);
        //process.exit()
    });
}