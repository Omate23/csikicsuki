#!/usr/bin/env node

var WebSocketClient = require('websocket').client;
var client = new WebSocketClient()
var request = require('request');
var fs = require('fs');

var conn, token, accounts, positions;
var synced = []
var contracts = []
var reqs = []
var fills = []
var tasks = []
var authentication = false  // auth in progress
var mid = 0; // message id
var debug = true

setTimeout(function () {
    var s = Read('settings.json')
    console.log(s);
    
    //Place({ 'accountId': s.accountId, 'action':'Sell', 'symbol':s.symbol, 'orderQty':s.lots })
    //PlaceOCO({ 'accountId': s.accountId, 'action':'Buy', 'symbol':s.symbol, 'orderQty':s.lots })
}, 3000)



request.post({
        url: 'https://demo-api-d.tradovate.com/v1/auth/accesstokenrequest',
        //json: { name: 'LSzancsik', password: encodeURIComponent('%22P*g&m') },
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        //body: 'user=LSzancsik&password=' + encodeURIComponent('%22P*g&m')
        //body: 'user=LSzancsik&password=%22P*g&m'
        //body: JSON.stringify({ name: 'LSzancsik', password: encodeURIComponent('%22P*g&m') })
        //body: JSON.stringify({ name: 'LSzancsik', password: '%22P*g&m' })
        body: JSON.stringify({ name: 'MOrdody', password: 'Vahot$11' })
    },
    function (error, response, body) {
        //console.log(body)
        if (!error && response.statusCode == 200) {
            token = JSON.parse(body)
            //console.log(token.accessToken)
            authentication = true
            client.connect('wss://demo-api-d.tradovate.com/v1/websocket');
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
                        return true
                    } else {
                        console.log('Connection Authorization Error');
                        return false
                    }
                }
                else if (got[0].s == 200) {
                    Got(got)
                    return true
                    /*
                    if (got[0].i == 2) {    // account/list
                        accounts = got[0].d
                        //console.log(accounts[0].name);
                        accounts.forEach(function (v,k) {
                            Get('position/list', '', )
                        })
                    }
                    else if (got[0].i == 3) {    // position/list
                        positions = got[0].d
                        //console.log(positions[0]);
                        positions.forEach(function (v,k) {
                            Get('contract/item', { id: v.contractId }, )
                        })
                    }
                    */
                }
                else if (got[0].e == 'props') {     // Event
                    GotEvent(got)
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

function GotEvent(got)   {
    if (debug) console.log(got[0].d);
    got.forEach(function (e,k) {
        //Append('eo', e.d);
        if (e.d.entityType == 'position' && e.d.eventType == 'Updated')   {
            //Append('posup', e);
            console.log('=' + e.d.entity.netPos);
            tasks.forEach(function (t,k) {
                console.log(t);
                console.log(GetSymbol(e.d.entity.contractId));
                console.log(e.d);
                if (t.type == 'copy' && t.from.id == 2712 && t.from.symbol == GetSymbol(e.d.entity.contractId))  {
                    //Place({ 'accountId': t.to.id, 'action':'Buy', 'symbol':t.to.symbol, 'orderQty':t.multiplier })
                }
            })
        }
    })
}


function Got(got)   {
    if (debug) console.log(got);
    var r = reqs[got[0].i]
    if (debug) console.log(r);
    if (r.url == 'order/placeorder')   {
        /*
        if (cnt++ < 10) {
            //console.log(cnt);
            if (cnt % 2) Place('Sell')
            else Place('Buy')
        }
        else {
            var d2 = new Date()
            console.log(d2 + ' ' + d2.getMilliseconds());
            //console.log(cnt);
            console.log('Diff: ');
            console.log(d2-d1);
        }
        */
    }
    else if (r.url == 'user/syncrequest')   {
        synced = got[0].d
        //Object.keys(got[0].d).forEach(function (v,k) { console.log(v); })
        Write('synced', synced)
    }/*
    else if (r.url == 'account/list')   {
        accounts = got[0].d
        //console.log(accounts[0].name);
        accounts.forEach(function (v,k) {
            Get('position/list', '', { account: v })
            Get('fill/list', null, { account: v })
        })
        Write('accounts', accounts)
    }
    else if (r.url == 'position/list')   {
        positions = got[0].d
        //console.log(positions[0]);
        positions.forEach(function (v,k) {
            if (!contracts[v.contractId])   {
                Get('contract/item', { id: v.contractId }, { account: positions.store, position: v } )
            }
        })
        Write('postions', positions)
    }
    else if (r.url == 'contract/item')   {
        if (!FindContract(got[0].d.id)) {
            contracts.push(got[0].d)
            //console.log(got[0].d.name);
            //contracts[got[0].d.id] = got[0].d.name
            //console.log(contracts);
            Write('contracts', contracts)
        }
    }
    else if (r.url == 'fill/list')   {
        fills.push({ AccountId: r.store.account.id, fills: got[0].d })
        Write('fills', fills)
    }
    */
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
        var frame = ['authorize', mid, '', token.accessToken].join("\n")
        conn.sendUTF(frame);
        if (debug) console.log(frame);
    } //else
}

function Heartbeat()    {
    console.log('[]');
    conn.sendUTF('[]');
}

function Place(trade)   {
    var expt = new Date();
    expt.setSeconds(expt.getSeconds() + 10);

    var data = {
        "orderType": "Market",
        "timeInForce": "GTD",
        "expireTime": expt.toISOString(),
    }
    console.log(Object.assign(trade, data));
    Post('order/placeorder', Object.assign(trade, data))
}

function Place0(bs)    {
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
    Post('order/placeorder', data)
}

function PlaceOCO(trade) {
    var expt = new Date();
    expt.setSeconds(expt.getSeconds() + 10);

    var data = {
        "orderType": "Limit",
        "timeInForce": "GTD",
        "expireTime": expt.toISOString(),
    }
    var data = {
        //"accountSpec": "string",
        "accountId": accounts[0].id,
        //"clOrdId": "string",
        "action": "Sell",
        "symbol": "NQH8",
        "orderQty": 1,
        "orderType": "Limit",
        "price": 6846,
        //"stopPrice": 0,
        //"maxShow": 0,
        //"pegDifference": 0,
        "timeInForce": "GTD",
        "expireTime": "2018-01-22T11:33.355Z",
        //"text": "string",
        //"activationTime": "2018-01-22T10:35:33.355Z",
        "other": {
            "action": "Buy",
            //"clOrdId": "string",
            "orderType": "Stop",
            //"price": 6829.5,
            "stopPrice": 6845,
            //"maxShow": 0,
            //"pegDifference": 0,
            //"timeInForce": "GTD",
            "expireTime": "2018-01-22T11:33:33.355Z",
            //"text": "string"
        }
    }
    Post('order/placeorder', Object.assign(trade, data))
    //Post('order/placeoco', data)
}

function ChangeDemoBalance()    {
    Post('cashBalance/changedemobalance', {
        "accountId": 0,
        "cashChange": 0
    })
}

function FindContract(c)    {
    return contracts.forEach(function (v,k)    {
        if (v.id == c.id) return v
    })
}

function Write(file, data)    {
    var dir = './data/'
    fs.writeFile(dir+file, JSON.stringify(data, null, 4), function(err) {
        if (err) { return console.log('File write error: ' + err); }
    })
}

function Append(file, data)    {
    var dir = './data/'
    fs.appendFile(dir+file, JSON.stringify(data, null, 4), function(err) {
        if (err) { return console.log('File write error: ' + err); }
    })
}

function Read(file)    {
    var dir = './data/'
    /*fs.readFile(dir+file, 'utf8', function(err, data) {
        if (err) { return console.log('File read error: ' + err); }
        tasks = JSON.parse(data)
    })*/
    return JSON.parse(fs.readFileSync(dir+file, 'utf8'))
}

function ObjectToQueryString(o) {
    if (!o) return null;
    var qs = Object.keys(o).map(function(k) {
        return k + '=' + o[k]
    }).join('&');
    return qs
}
