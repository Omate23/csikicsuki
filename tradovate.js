#!/usr/bin/env node

var WebSocketClient = require('websocket').client;
var api = new WebSocketClient()
var market = new WebSocketClient()

var request = require('request');
var fs = require('fs');

const EventEmitter = require('events').EventEmitter;
const TradovateEvents = new EventEmitter;
exports.Events = TradovateEvents;

var control = require('./control');
var settings = control.settings

var token
var apiConnection, marketConnection
var reqs = []
var authenticationAPI = false, authenticationMarket = false;  // auth in progress
var mid = 0; // message id
var debug = false

request.post({
        url: 'https://demo-api-d.tradovate.com/v1/auth/accesstokenrequest',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ name: 'MOrdody', password: 'Vahot$11' })
    },
    function (error, response, body) {
        //console.log(body)
        if (!error && response.statusCode == 200) {
            token = JSON.parse(body)
            authenticationAPI = true
            api.connect('wss://demo-api-d.tradovate.com/v1/websocket');
        }        
    }
);

api.on('connectFailed', function(error) {
    console.log('Connect API Error: ' + error.toString());
});
market.on('connectFailed', function(error) {
    console.log('Connect Market Error: ' + error.toString());
});

api.on('connect', function(connection) {
    apiConnection = connection
    console.log('WebSocket API Client Connected');
    connection.on('error', function(error) {
        console.log("API Connection Error: " + error.toString());
    });
    connection.on('close', function(message) {
        console.log(': '+message);
        console.log('API Connection Closed');
    });
    connection.on('message', function(message) {
        //console.log(message);
        if (message.type === 'utf8') {
            //console.log("API Received: '" + message.utf8Data + "'")
            if (message.utf8Data.substr(0,1) == 'a')    {
                var got = JSON.parse(message.utf8Data.substr(1))    // chop beginning 'a'
                if (authenticationAPI) {
                    if (got[0].i == 1 && got[0].s == 200) {
                        console.log('API Connection Authorized');
                        authenticationAPI = false
                        Post(connection, 'user/syncrequest', { "users": [3158] });
                        authenticationMarket = true
                        market.connect('wss://md-api-d.tradovate.com/v1/websocket');
                        return true
                    } else {
                        console.log('Connection Authorization Error');
                        return false
                    }
                } else if (got[0].s == 200) {
                    Got(got)
                    return true
                } else if (got[0].e == 'props') {     // Event
                    GotEvent(got)
                    return true
                } else {
                    console.log('Not OK!');
                    console.log("Received: '" + message.utf8Data + "'")
                    return false
                }
            }
            else if (message.utf8Data == 'h') Heartbeat(connection)
            else if (message.utf8Data == 'o') Authorize(connection)
            else if (message.utf8Data == 'c') Closed()
            else if (debug) console.log('Unknown frame: ' + message.utf8Data);
        } else { 
            console.log('Something non-UTF-8...: ' + message);
        }
    });
});

market.on('connect', function(connection) {
    marketConnection = connection
    console.log('WebSocket Market Client Connected');
    connection.on('error', function(error) {
        console.log("Market Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('Market Connection Closed');
    });
    connection.on('message', function(message) {
        //console.log(message);

        if (message.type === 'utf8') {
            //console.log("Market Received: '" + message.utf8Data + "'")
            if (message.utf8Data.substr(0,1) == 'a')    {
                var got = JSON.parse(message.utf8Data.substr(1))    // chop beginning 'a'
                if (authenticationMarket) {
                    if (got[0].i == 3 && got[0].s == 200) {
                        console.log('Market Connection Authorized');
                        authenticationMarket = false
                        if (settings.quote) Get(connection, 'md/subscribeQuote', { "symbol": settings.symbol })
                        if (settings.DOM) Get(connection, 'md/subscribeDOM', { "symbol": settings.symbol })
                        if (settings.histogram) Get(connection, 'md/subscribeHistogram', { "symbol": settings.symbol })
                        if (settings.chart) Get(connection, 'md/getChart', {
                            "symbol":settings.symbol,
                            "chartDescription": {
                                "underlyingType":"MinuteBar", // Available values: Tick, DailyBar, MinuteBar, Custom, DOM
                                "elementSize":15,
                                "elementSizeUnit":"UnderlyingUnits", // Available values: Volume, Range, UnderlyingUnits, Renko, MomentumRange, PointAndFigure, OFARange
                                "withHistogram": false
                            },
                            "timeRange": {
                                // All fields in "timeRange" are optional, but at least anyone is required
                                //"closestTimestamp":"2018-08-10T10:00Z",
                                //"closestTickId":123,
                                //"asFarAsTimestamp":"2018-08-15T18:00Z",
                                "asMuchAsElements":50
                            },
                        })
                        TradovateEvents.emit('connected')        
                        return true
                    } else {
                        console.log('Connection Authorization Error');
                        return false
                    }
                } else if (got[0].s == 200) {
                    Got(got)
                    return true
                } else if (got[0].e == 'md') {     // Market data
                    GotMD(got)
                    return true
                } else if (got[0].e == 'chart') {     // Market data
                    GotChart(got)
                    return true
                } else {
                    console.log('Not OK MD!');
                    console.log("Received: '" + message.utf8Data + "'")
                    return false
                }
            }
            else if (message.utf8Data == 'h') Heartbeat(connection)
            else if (message.utf8Data == 'o') Authorize(connection)
            else if (message.utf8Data == 'c') Closed()
            else { if (debug) console.log('Unknown frame: ' + message.utf8Data);  }
        }
        else { console.log('Something non-UTF-8...: ' + message); }
    });
});

function GotMD(got)   {
    if (debug) console.log(got[0].d);
    got.forEach(function (e,k) {
        if (e.d.doms)   {
            TradovateEvents.emit('domchange', e.d.doms)
        }
        else if (e.d.quotes)   {
            TradovateEvents.emit('pricechange', e.d.quotes[0])
        }
        else if (e.d.histograms)   {
            TradovateEvents.emit('histogramchange', e.d.histograms[0])
        }
    })
}

function GotChart(got)   {
    if (debug) console.log(got[0].d);
    return;
    got.forEach(function (e,k) {
        if (e.d.doms)   {
            TradovateEvents.emit('domchange', e.d.doms)
        }
        else if (e.d.quotes)   {
            TradovateEvents.emit('pricechange', e.d.quotes[0])
        }
        else if (e.d.histograms)   {
            TradovateEvents.emit('histogramchange', e.d.histograms[0])
        }
    })
}

function GotEvent(got)   {
    //console.log(got[0].d)
    if (debug) console.log(got[0].d);
    got.forEach(function (e,k) {
        if (e.d.entityType == 'position' && e.d.eventType == 'Updated')   {
            //console.log('=' + e.d.entity.netPos);
            TradovateEvents.emit('positionchange', e.d.entity)
        }
        else if (e.d.entityType == 'fill' && e.d.eventType == 'Created')   {
            TradovateEvents.emit('fillevent', e.d.entity)
        }
    })
}


function Got(got)   {
    if (debug) console.log(got);
    var r = reqs[got[0].i]
    if (debug) console.log(r);
    if (r.url == 'order/placeorder')   {
        TradovateEvents.emit('fill', got[0].d)
    }
    else if (r.url == 'user/syncrequest')   {
        synced = got[0].d
        console.log('User Synced');
        //Object.keys(got[0].d).forEach(function (v,k) { console.log(v); })
        //Write('synced', synced)
    }
}

function Get(conn, url, queryarr, store)  {
    if (conn.connected) {
        ++mid
        //var query = (queryarr.length) ? ArrayToQueryString(queryarr) : ''
        var query = ObjectToQueryString(queryarr)
        var frame = [url, mid, query, ''].join("\n")
        conn.sendUTF(frame);
        reqs[mid] = []
        reqs[mid].url = url
        reqs[mid].query = queryarr
        reqs[mid].store = store
        if (debug) console.log(frame);
    } //else setTimeout(Msg(url, url, query, body), 50);
}

function Post(conn, url, bodyarr, store)  {
    if (conn.connected) {
        ++mid
        var body = JSON.stringify(bodyarr)
        var frame = [url, mid, '', body].join("\n")
        conn.sendUTF(frame);
        reqs[mid] = []
        reqs[mid].url = url
        reqs[mid].query = bodyarr
        reqs[mid].store = store
        //if (url.match('place') ||debug) console.log(frame);
    } //else setTimeout(Msg(url, url, query, body), 50);
}

function GetSymbol(cid) {
    var symname
    synced.contracts.forEach(function (c,k) {
        console.log(c.id, cid, c.name);
        console.log(c.id==cid);
        if (c.id == cid) { symname = c.name; return }
    })
    return symname
}

function Authorize(conn)    {
    if (conn.connected) {
        ++mid
        var frame = ['authorize', mid, '', token.accessToken].join("\n")
        conn.sendUTF(frame);
        if (debug) console.log(frame);
    } //else
}

function Heartbeat(conn)    {
    //console.log('[]');
    conn.sendUTF('[]');
}

exports.Place = function(trade)   {
    var expt = new Date();
    //expt.setSeconds(expt.getSeconds() + 60*60);
    expt.setSeconds(expt.getSeconds() + 15);

    var data = {
        "orderType": "Market",
        "timeInForce": "GTD",
        "expireTime": expt.toISOString(),
    }
    //console.log(Object.assign(trade, data));
    Post(apiConnection, 'order/placeorder', Object.assign(trade, data))
}

exports.Modify = function(trade)   {
    var expt = new Date();
    expt.setSeconds(expt.getSeconds() + 60*60);

    var data = {
        "timeInForce": "GTD",
        "expireTime": expt.toISOString(),
    }
    //console.log(Object.assign(trade, data));
    Post(apiConnection, 'order/modifyorder', Object.assign(trade, data))
}

exports.Cancel = function(trade)   {
    Post(apiConnection, 'order/cancelorder', trade)
}

exports.Place0 = function(bs)    {
    console.log(bs);
    var data = {
        //"accountSpec": "DEMO03159",
        "accountId": accounts[0].id,
        //"clOrdId": "string",
        "action": bs,//"Buy",
        "symbol": "NQH8",
        "orderQty": 1,
        "orderType": "Market",
        //"price": 6830.0,
        //"stopPrice": 6829.5,
        //"maxShow": 1,
        //"pegDifference": 0,
        "timeInForce": "GTD",
        "expireTime": "2018-01-23T10:20:33.360Z",
        //"text": "ho!",
        //"activationTime": "2018-01-22T11:46:33.360Z"
    }
    Post(apiConnection, 'order/placeorder', data)
}

exports.PlaceOCO = function(trade) {
    var expt = new Date();
    expt.setSeconds(expt.getSeconds() + 60*60);

    var data = {
        "orderType": "Limit",
        "timeInForce": "GTD",
        "expireTime": expt.toISOString(),
        /*"other": {
            "expireTime": expt.toISOString(),
        }*/
    }
    //console.log(Object.assign(trade, data));
    Post(apiConnection, 'order/placeorder', Object.assign(trade, data))
    //Post('order/placeoco', data)
}

function ObjectToQueryString(o) {
    if (!o) return null;
    var qs = Object.keys(o).map(function(k) {
        return k + '=' + o[k]
    }).join('&');
    return qs
}

function Read(file)    {
    var dir = './data/'
    /*fs.readFile(dir+file, 'utf8', function(err, data) {
        if (err) { return console.log('File read error: ' + err); }
        tasks = JSON.parse(data)
    })*/
    return JSON.parse(fs.readFileSync(dir+file, 'utf8'))
}

exports.Ping = function (p) {
    console.log(p);
}
