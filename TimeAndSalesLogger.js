const fs = require('fs');

var today = new Date().today()

function Log(quote)  {
    //console.log(quote);
    var dir = '';
    if (quote.entries.Bid.price == quote.entries.Trade.price) {
        dir = 'Bid';
    } else if (quote.entries.Offer.price == quote.entries.Trade.price) {
        dir = 'Offer';
    }
    fs.appendFile('./data/tasx_'+today+'.log',
        [quote.timestamp, quote.entries.Trade.price, quote.entries.Trade.size, dir, "\n"].join(';'),
        function(err) {
            if (err) { return console.log('File write error: ' + err); }
        }
    )
    fs.appendFile('./data/tas_'+today+'.log',
        [quote.timestamp, quote.entries.Trade.price, quote.entries.Trade.size, quote.entries.Bid.price, quote.entries.Offer.price, "\n"].join(';'),
        function(err) {
            if (err) { return console.log('File write error: ' + err); }
        }
    )
}

module.exports.Log = Log;

