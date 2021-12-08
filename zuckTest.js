/**
 * Perform a auto buy attack on matic
*/
var Web3 = require('web3');
var abiDecoder = require('abi-decoder');
var colors = require("colors");
var Tx = require('ethereumjs-tx').Transaction;
var axios = require('axios');
var BigNumber = require('big-number');
const  {HTTP_PROVIDER_LINK,PRIVATE_KEY,zuckV1ABI,zuckV1Addr,Proxy_addr,var1} = require('./zuckEnv.js');


const provider = new Web3.providers.HttpProvider(HTTP_PROVIDER_LINK);
const web3 = new Web3(provider);

const user_wallet = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
const ONE_GWEI = 1e9;

const zuckV1Contract = new web3.eth.Contract(
    zuckV1ABI,
    zuckV1Addr
);


async function main(){
    // await UpdateProxy(user_wallet);
    // await TestProxy(user_wallet);
}

async function UpdateProxy(user_wallet){
    tx = zuckV1Contract.methods.updateVar1(var1);
    data = tx.encodeABI();
    gas = await tx.estimateGas({from: user_wallet.address});
    gasPrice = await web3.eth.getGasPrice();
    txData = {
      from: user_wallet.address,
      to: Proxy_addr,
      data, 
      gas: gas + 50000,
      gasPrice
    };
	var signedTX = await user_wallet.signTransaction(txData);
	var transactionHash = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
	var receipt = await web3.eth.getTransactionReceipt(transactionHash);
	console.log(receipt);
}

async function TestProxy(user_wallet){
    tx = zuckV1Contract.methods.var1();
    data = tx.encodeABI();
    txData = {
      from: user_wallet.address,
      to: Proxy_addr,
      data: data, 
    };
    var var1 = await web3.eth.call(txData);
    console.log('va1 is: '+var1)
}

main();