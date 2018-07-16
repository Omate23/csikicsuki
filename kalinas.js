#!/usr/bin/env node

var WebSocketClient = require('websocket').client;
var client = new WebSocketClient()
var request = require('request');
var fs = require('fs');

var conn, token, accounts, positions;
var synced = []
var reqs = []
var authentication = false  // auth in progress
var mid = 0; // message id
var debug = false

/*setTimeout(function () {
    var s = Read('settings.json')
    //console.log(s);
    
    //Place({ 'accountId': s.accountId, 'action':'Buy', 'symbol':s.symbol, 'orderQty':s.lots })
}, 2000)*/



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
            //console.log(token)
            authentication = true
            client.connect('wss://md-api-d.tradovate.com/v1/websocket');
        }        
    }
);

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    conn = connection
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        //console.log('echo-protocol Connection Closed');
        console.log('Connection Closed');
    });
    connection.on('message', function(message) {
        //console.log(message);

        if (message.type === 'utf8') {
            //console.log("Received: '" + message.utf8Data + "'")
            if (message.utf8Data.substr(0,1) == 'a')    {
                var got = JSON.parse(message.utf8Data.substr(1))    // chop beginning 'a'
                if (authentication) {
                    if (got[0].i == 1 && got[0].s == 200) {
                        console.log('Connection Authorized');
                        authentication = false
                        //Post('user/syncrequest', { "users": [3159] });
                        //Get('account/list', '')
                        Get('md/subscribeQuote', { "symbol":"ESU8" })
                        return true
                    } else {
                        console.log('Connection Authorization Error');
                        return false
                    }
                }
                else if (got[0].s == 200) {
                    //Got(got)
                    return true
                }
                else if (got[0].e == 'props') {     // Event
                    //GotEvent(got)
                    return true
                }
                else if (got[0].e == 'md') {     // Market data
                    GotMD(got)
                    return true
                }
                else {
                    console.log('Not OK!');
                    console.log("Received: '" + message.utf8Data + "'")
                    return false
                }
            }
            else if (message.utf8Data == 'h') Heartbeat()
            else if (message.utf8Data == 'o') Authorize()
            else if (message.utf8Data == 'c') Closed()
            else { console.log('Unknown frame: ' + message.utf8Data);  }
        }
        else { console.log('Something non-UTF-8...: ' + message); }
    });
});

function GotMD(got)   {
    if (debug) console.log(got[0].d);
    got.forEach(function (e,k) {
        if (e.d.quotes)   {
            Kalinas(e.d.quotes[0]);
        }
    })
}


function Kalinas(quote)  {
    console.log(quote);
    var dir = '';
    if (quote.entries.Bid.price == quote.entries.Trade.price) {
        dir = 'Bid';
    } else if (quote.entries.Offer.price == quote.entries.Trade.price) {
        dir = 'Ask';
    }
    fs.appendFile('./data/tas.log', 
                    [quote.timestamp, quote.entries.Trade.price, quote.entries.Trade.size, dir, "\n"].join(';'),
                    function(err) {
        if (err) { return console.log('File write error: ' + err); }
    })
}

function Get(url, queryarr, store)  {
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

function Post(url, bodyarr, store)  {
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

function Authorize()    {
    //Post('authorize', token.accessToken);
    if (conn.connected) {
        ++mid
        //var frame = ['authorize', mid, '', token.accessToken].join("\n")
        var frame = ['authorize', mid, '', token.mdAccessToken].join("\n")
        conn.sendUTF(frame);
        if (debug) console.log(frame);
    } //else
}

function Heartbeat()    {
    console.log('[]');
    conn.sendUTF('[]');
}

function Append(file, data)    {
    var dir = './data/'
    fs.appendFile(dir+file, JSON.stringify(data, null, 4), function(err) {
        if (err) { return console.log('File write error: ' + err); }
    })
}


function ObjectToQueryString(o) {
    if (!o) return null;
    var qs = Object.keys(o).map(function(k) {
        return k + '=' + o[k]
    }).join('&');
    return qs
}
