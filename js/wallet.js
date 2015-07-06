var WALLET = new function ()
{
  this.keys = [];
  this.withdrawals = 3;

  // Methods
  this.textToBytes = function(text) {
    return Bitcoin.Crypto.SHA256(text, { asBytes: true });
  };

  this.getKeys = function() {
    return this.keys;
  };

/* this fetches all BTC amounts from the public addr page (element: #balance-<addr>), adds them up */
  this.getBalance = function() {
	//console.log(this.getKeys());
    balance = 0;
    for(i = 0; i < this.getKeys().length; i++) {
	var addr = this.getKeys()[i].getAddress(NETWORK_VERSION).toString();
	//console.log("getBalance addrs" + addr);
      _b = parseFloat($('#balance-' + addr).text());
      if (!isNaN(_b)) {
        balance = balance + _b;
      }
    }
    return balance;
  }

  this.isReady = function() {
    return this.keys.length != 0;
  }

  this.faucetWithdrawal = function(callback) {
    if (USE_TESTNET) {
      if (this.withdrawals <= 0) {
        return;
      }
      this.withdrawals -= 1;
      var delayedUpdate = function() {
        if (callback) callback();
      }
      var address = this.getKeys()[0].getAddress(NETWORK_VERSION).toString();
      helloblock.faucetWithdrawal(address, 30000, function(result) {
        if (callback) callback(result)
      })
    }
  }

/**
 * This updates the "Balance" column on the "Public Addresses" page
 *
 */
  this.updateAllBalances = function() {
    var addresses = [];
    for(i = 0; i < this.getKeys().length; i++)
    {
      addresses[i] = this.getKeys()[i].getAddress(NETWORK_VERSION).toString();
    }

	
	insight.retrieveAllBalances(addresses, function(addresses) {
		console.log("return insight retrieve balances");
		/* Ugh, no underscore available */
		for (var address in addresses) {
			//console.log("Addr amounts" + address);
			$('#balance-' + address).text(addresses[address] / 100000000.0);
		}
	});
  };
}
