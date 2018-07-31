function Level(offset, volume) {
    this.offset = offset;
    this.volume = volume;
    this.time = new Date() / 1000;  // seconds since Epoch
    this.recentBid = 0;
    this.recentOffer = 0;
    //this.price = this.getPrice();
}

Level.prototype.update = function(vol) {
    this.volume = vol
    this.time = new Date() / 1000;
    //console.log(this);
    
};

Level.prototype.updateBid = function(vol) {
    this.recentBid += vol - this.volume
    this.update(vol)
};

Level.prototype.updateOffer = function(vol) {
    this.recentOffer += vol - this.volume
    this.update(vol)
};

Level.prototype.getBulls = function() {
};

Level.prototype.clearRecent = function(secs) {
    this.recentBid = 0
    this.recentOffer = 0
};

Level.prototype.getPrice = function(base, ticksize) {
};

module.exports = Level 
