const fs = require('fs');

// For todays date;
Date.prototype.today = function () { 
    //return ((this.getDate() < 10)?"0":"") + this.getDate() +"-"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"-"+ this.getFullYear();
    return this.getFullYear() + "-" + (((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) + "-" + ((this.getDate() < 10)?"0":"") + this.getDate();
}

var today = new Date().today()

function Log(data)  {
    data.forEach((dom) => {
        var out = []
        out.push(dom.timestamp)
        dom.bids.reverse().forEach((d) => {
            out.push(d.price)
            out.push(d.size)
        })
        dom.offers.forEach((d) => {
            out.push(d.price)
            out.push(d.size)
        })
        fs.appendFile('./data/dom_'+today+'.log',
            out.join(',') + "\n",
            function(err) {
                if (err) { return console.log('File write error: ' + err); }
            }
        )        
    })
}

module.exports.Log = Log;


