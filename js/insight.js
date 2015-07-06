/**
 * Insight replacement functions for HelloBlock
 * Provides functions used in coinshuffle-wallet, but for insight.
 *
 * Inspired by coinshuffle-sim / coinshuffle-wallet code by Bryan Vu
 *
 * @author Jan-Willem Selij
 */

config = new Config();

/*
 * I don't like it to just call it "insight", but this makes it easier to replace in other files.
 * Naming it this way would actually indicate this is a generic lib for insight, which it isn't.
 * These are roughly the same functions the helloblock-helper provides
 * 
 * Probably isn't the cleanest way of creating an utility class, class.prototype is perhaps
 * the preferred way.
 */
var insight = new function () {

	/**
	 * Used to retrieve this https://helloblock.io/docs/ref#addresses-batch
	 *
	 * Couldn't find if requesting the balance actually takes all UTXO into account
	 * It's somewhere here in insight:
	 * 	- app/controllers/addresses.js (exports.utxo / exports.balance)
	 *	- app/models/Address.js
	 *
	 * This just has to return an object of values, key as address
	 * {address: satoshi_value, ...}
	 */
	this.retrieveAllBalances = function(addresses, callback) {
		this.getUnspentOutputs(addresses, function(response) {
			/* Pretty sure there is a better way than calling myself directly */
               		callback(insight.combineUnspentOutputs(response));
		});
	}

	/**
	 * Combines all listed UTXO's
	 *
	 * Input: [{address: <addr>, amount: <dotted_btc>}, { ... }]
	 *
	 * @return {address: totalUTXO, address2: totalUTXO2, [...]}
	 */
	this.combineUnspentOutputs = function(unspentOutputs) {
		var addresses = {};

		unspentOutputs.forEach(function(utxo) {
			if (!addresses.hasOwnProperty(utxo.address)) {
				addresses[utxo.address] = (utxo.amount * 100000000);
			}
			else {
				addresses[utxo.address] = addresses[utxo.address] += (utxo.amount * 100000000);
			}
			//totalAmount += (utxo.amount * 100000);
		});
		return addresses;
	}

	/* UTXO */
	// either one address or [addr1, addr2, ...]
	this.getUnspentOutputs = function(address, callback) {
		var URL = "http://" + config.insight_api_host + ":" + config.insight_api_port + "/api/";

		/* Use /addrs/<addr1,addr2,...>/utxo for multiple, /addr/<addr1>/utxo for single */
		if (Array.isArray(address)) {
			URL = URL + "addrs/";
			URL = URL + address.join(",") + "/utxo";
		}
		else {
			URL = URL + "addr/" + address + "/utxo";
		}

		console.log("Retrieve UTXO URL -> " + URL);
		
    		$.ajax({
        		url: URL,
        		type: "GET",
        		context: this,
        		error: function (err) { console.log(err); },
        		dataType: 'text',
        		success: function (response) {
                		console.log(JSON.parse(response));
                		response = JSON.parse(response);

				callback(response);
        		}
    		});
	}
}
