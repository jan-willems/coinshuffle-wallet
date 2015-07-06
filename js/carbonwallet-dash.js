config = new Config();

$(document).ready(function() {
  setInterval(updateDashboard, (config.dashboard_update_frequency * 1000));
  setInterval(updateBalances, (600 * 1000));

/**
 * This updates the values on the "Dashboard" page
 *
 * JWS: Now updates to block height and mining difficulty
 *
 * BTC balance is fetched from the WALLET class (js/wallet.js)
 */
  function updateDashboard() {

    if (! WALLET.isReady())
      return;

    $.ajax({
	url: "http://" + config.insight_api_host + ":" + config.insight_api_port + "/api/status?q=getInfo",
        type: "GET",
        context: this,
        error: function () {},
        dataType: 'text',
        success : function (response) {
		//console.log(JSON.parse(response));
		response = JSON.parse(response);
            $('#btc-block-height').text(response.info.blocks);

            var balance = WALLET.getBalance();
            $('#btc-balance').text(formatBTC(balance));

//            balance = balance * parseFloat(response);
            $('#mining-difficulty').text(response.info.difficulty);
        }
    });

  }

/*
 * This updates the source addresses on the "Make Payment" page
 *
 */
  function updateBalances() {


    if (! WALLET.isReady())
      return;

    WALLET.updateAllBalances();
    $("#txDropAddr").find("option").remove();

    for(i = 0; i < WALLET.getKeys().length; i++)
    {
      var addr = WALLET.getKeys()[i].getAddress(NETWORK_VERSION).toString();
      $('#address' + i).text(addr);
      $("#txDropAddr").append('<option value=' + i + '>' + addr + '</option>');
    }

  }

  function formatBTC(btc) {
    if(btc < 0.001)
      return btc.toFixed(5);
    return btc.toFixed(3);
  }
});
