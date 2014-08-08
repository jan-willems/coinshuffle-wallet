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

    socket.emit('register', shuffleRequest)
    
    socket.on('registration_result', function (result) {
      callback(result)
    })

    socket.on('encrypt_output', function (pubKeys) {
      socket.emit('encrypted_output', Client.encryptOutput(pubKeys, outputAddress))
    })

    socket.on('decrypt_and_shuffle_outputs', function (encOutputs) {
      var partiallyDecryptedOutputs = []

      encOutputs.forEach(function (encOutput) {
        try {
          var decryptionResult = bitcore.ECIES.decrypt(new Buffer(privKey, 'hex'), toBuffer(encOutput))

          if (decryptionResult !== '') {
            partiallyDecryptedOutputs.push(decryptionResult)
          }
        } catch (err) {
          //suppress decryption errors resulting frmo all clients trying to decrypt all outputs.
        }
      })

      if (partiallyDecryptedOutputs.length > 0) {
        partiallyDecryptedOutputs = randomizeOrder(partiallyDecryptedOutputs)
        socket.emit('partially_decrypted_outputs', partiallyDecryptedOutputs)
      }
    })

    var signingKey = inputPrivKey
    socket.on('request_transaction_signature', function (signatureRequest) {
      var tx = TransactionBuilder.fromObj(JSON.parse(signatureRequest.transaction))

      if(signatureRequest.inputAddresses[signatureRequest.inputIndex] === inputAddress) {
        tx.sign([signingKey])
        socket.emit('transaction_input_signed', {'transaction': JSON.stringify(tx.toObj()), 'inputIndex': signatureRequest.inputIndex})
      }
    })

    socket.on('shuffle_complete', function() {
      disconnect(socket)
    })
  }  

  this.encryptOutput = function(pubKeys, output) {
    console.log(output)

    var encryptedOutput = new Buffer(output)

    pubKeys.forEach(function (pubKey) {
      var pub = new Buffer(pubKey, 'hex')

      var encrypted = bitcore.ECIES.encrypt(pub, encryptedOutput)
      encryptedOutput = encrypted
    })

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