#!/usr/bin/env node

var tradovate = require('./tradovate');

const EventEmitter = require('events').EventEmitter;
const TradovateEvents = new EventEmitter;




/*TradovateEvents.on('price', function (quote) {
    console.log(quote);
    
});*/

/*
on pozi change
ha 0, BUY vagy SELL
ha 1 vagy -1, OCO(price, sl táv, tp táv)
*/


