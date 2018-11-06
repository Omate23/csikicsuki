#!/usr/bin/env node

//var fs = require('fs');
//var request = require('request');
var tradovate = require('./tradovate1');
//var utils = require('./tradutils');
var domlogger = require('./Level2Logger');
var pricelogger = require('./TimeAndSalesLogger');



tradovate.Events.on('connected', () => {
    tradovate.Subscribe('DOM', 'NQZ8')
    tradovate.Subscribe('quote', 'NQZ8')
})

tradovate.Events.on('domchange', (data) => {
    domlogger.Log(data)
})

tradovate.Events.on('pricechange', (data) => {
    pricelogger.Log(data);
})
