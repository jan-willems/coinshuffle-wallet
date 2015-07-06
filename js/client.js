'use strict';

// New client based on TX code

var bitcore = require('bitcore')
var WalletKey = bitcore.WalletKey
var networks = bitcore.networks
var TransactionBuilder = bitcore.TransactionBuilder
var Buffer = bitcore.Buffer

var Client = new function() {

  var privKey = '';
  var pubKey = '';
  var inputPrivKey = '';
  var inputAddress = '';
  var outputAddress = '';
  var changeAddress = '';
  var wkObj = '';

  this.init = function(_inputPrivKey, _outputAddress, _changeAddress ) {
    var wk = new WalletKey({ network: networks.testnet });
    wk.generate();    

    wkObj = wk.storeObj();

    var inputWk = new WalletKey({ network: networks.testnet });    
    inputWk.fromObj({priv: _inputPrivKey})
    var inputWkObj = inputWk.storeObj();

    privKey = wk.privKey.private.toString('hex');
    pubKey = wkObj.pub;
    inputPrivKey = _inputPrivKey;
    inputAddress = inputWkObj.addr;
    outputAddress = _outputAddress;
    changeAddress = _changeAddress;
  }

  this.register = function(denomination, serverUrl, callback) {
    var options ={
      transports: ['websocket'],
      'forceNew': true
    };

    var socket = io.connect(serverUrl, options)
    var shuffleRequest = {
      pubKey: pubKey,
      inputAddress: inputAddress,
      changeAddress: changeAddress,
      denomination: denomination
    }

    console.log("Shuffle request -> " + JSON.stringify(shuffleRequest));

    socket.emit('register', shuffleRequest)
    console.log("Emitted 'register' with the request.");
    
    socket.on('registration_result', function (result) {
      console.log("Received 'registration_result' " + JSON.stringify(result));
      callback(result)
    })

    socket.on('encrypt_output', function (pubKeys) {
      console.log("Received 'encrypt_output' with pubKeys -> " + pubKeys);
      console.log("Emitting 'encrypted_output'");
      socket.emit('encrypted_output', Client.encryptOutput(pubKeys, outputAddress))
    })

    socket.on('decrypt_and_shuffle_outputs', function (encOutputs) {
      console.log("Received 'decrypt_and_shuffle_outputs' -> " + encOutputs);
      var partiallyDecryptedOutputs = []

      encOutputs.forEach(function (encOutput) {
        try {
          var decryptionResult = bitcore.ECIES.decrypt(new Buffer(privKey, 'hex'), toBuffer(encOutput))

          if (decryptionResult !== '') {
            partiallyDecryptedOutputs.push(decryptionResult)
          }
        } catch (err) {
          console.log("'decrypt_and_shuffle_outputs' error: " + err);
          //suppress decryption errors resulting from all clients trying to decrypt all outputs.
        }
      })

      if (partiallyDecryptedOutputs.length > 0) {
        partiallyDecryptedOutputs = randomizeOrder(partiallyDecryptedOutputs)
	console.log("Emitted 'partially_decrypted_outputs'.");
        socket.emit('partially_decrypted_outputs', partiallyDecryptedOutputs)
      }
    })

    var signingKey = inputPrivKey
    socket.on('request_transaction_signature', function (signatureRequest) {
      console.log("Received 'request_transaction_signature' signatureRequest -> " + signatureRequest);
      var tx = TransactionBuilder.fromObj(JSON.parse(signatureRequest.transaction))

      if(signatureRequest.inputAddresses[signatureRequest.inputIndex] === inputAddress) {
        tx.sign([signingKey])
        socket.emit('transaction_input_signed', {'transaction': JSON.stringify(tx.toObj()), 'inputIndex': signatureRequest.inputIndex})
        console.log("Emitted 'transaction_input_signed'.");
      }
    })

    socket.on('shuffle_complete', function() {
      console.log("Received 'shuffle_complete'. Disconnecting.");
      disconnect(socket)
    })
  }  

  this.encryptOutput = function(pubKeys, output) {
    console.log("Called encryptOutput() pubKeys-> " + pubKeys + " output-> " + output);

    var encryptedOutput = new Buffer(output)

    pubKeys.forEach(function (pubKey) {
      var pub = new Buffer(pubKey, 'hex')

      var encrypted = bitcore.ECIES.encrypt(pub, encryptedOutput)
      encryptedOutput = encrypted
    })

    console.log("Returning encrypted output -> " + encryptedOutput);

    return encryptedOutput
  }  
}

var disconnect = function(socket) {
  socket.disconnect()
}

function toBuffer(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

function randomizeOrder(array) {
  var currentIndex = array.length
  var temporaryValue
  var randomIndex

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}
