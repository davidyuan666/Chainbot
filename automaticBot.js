/**
 * Perform a auto buy attack on matic
*/
var Web3 = require('web3');
var abiDecoder = require('abi-decoder');
var colors = require("colors");
var Tx = require('ethereumjs-tx').Transaction;
var axios = require('axios');
var BigNumber = require('big-number');
const  {HTTP_PROVIDER_LINK,PRIVATE_KEY,DAIADDRESS,DAIABI,KOMSALEABI,KOMSALEADDR,BOT_NUM,OPERATION,
    APPROVE_AMOUNT,
    DAI_AMOUNT,
    BUY_AMOUNT,} = require('./komEnv.js');


const provider = new Web3.providers.HttpProvider(HTTP_PROVIDER_LINK);
const web3 = new Web3(provider);

const user_wallet = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
const ONE_GWEI = 1e9;

const daiContract = new web3.eth.Contract(
    DAIABI,
    DAIADDRESS,
);

const komSaleContract = new web3.eth.Contract(
    KOMSALEABI,
    KOMSALEADDR,
);

async function main(){
    switch(OPERATION){
        case 1:
            await approve(DAIaddress, user_wallet);
            break;
        case 2:
            await mintTokensByDAI(user_wallet);
            break;
        case 3:
            await createBotAccount();
            break;
    }

    // await approve(DAIaddress, user_wallet);
    // await setMintDAIPrice(user_wallet)
    // await mintTokensByDAI(user_wallet);
    // await createBotAccount();
    
}

// setInterval(async function() { // `data` returns undefined
//     await mintTokensByDAI(user_wallet)
//  }, 3000);


async function createBotAccount(){
    for(var i =0;i<BOT_NUM;i++){
        var account = web3.eth.accounts.create();
        console.log('Account: '+account.address);
        console.log('PrivateKey: '+account.privateKey);
        console.log('---------------------------------')  
    }
}

async function approve(out_token_address, user_wallet){
    var allowance = await daiContract.methods.allowance(user_wallet.address, komSaleAddress).call();
    console.log('allowance is: '+ allowance)
    allowance = BigNumber(allowance);

    var decimals = BigNumber(10).power(18);
    var max_allowance = BigNumber(APPROVE_AMOUNT).multiply(decimals);
    
    var approveTX ={
                from: user_wallet.address,
                to: out_token_address,
                gas: 50000,
                gasPrice: 10*ONE_GWEI,
                data: daiContract.methods.approve(komSaleAddress, max_allowance).encodeABI()
        }

    var signedTX = await user_wallet.signTransaction(approveTX);
    var transactionHash = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
    var receipt = await web3.eth.getTransactionReceipt(transactionHash);
    console.log('Approved Token'+ receipt)
    
};


async function setMintDAIPrice(user_wallet){
    var decimals = BigNumber(10).power(18);
    var DAIPrice = BigNumber(2).multiply(decimals);
    var reqTX ={
                from: user_wallet.address,
                to: KOMSALEADDR,
                gas: 5000000,
                gasPrice: 10*ONE_GWEI,
                data: komSaleContract.methods.setMintDAIPrice(DAIPrice).encodeABI()
        }

    var signedTX = await user_wallet.signTransaction(reqTX);
    var transactionHash = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
    var receipt = await web3.eth.getTransactionReceipt(transactionHash);
    console.log('setMintDAIPrice Tx: '+ receipt)
    
};


async function mintTokensByDAI(user_wallet){
    try{
        var decimals = BigNumber(10).power(18);
        var DAIAmount = BigNumber(DAI_AMOUNT).multiply(decimals);
        var KOMAmount = BUY_AMOUNT;
        var reqTX ={
                    from: user_wallet.address,
                    to: KOMSALEADDR,
                    gas: 5000000,
                    gasPrice: 10*ONE_GWEI,
                    data: komSaleContract.methods.mintTokensByDAI(KOMAmount,DAIAmount).encodeABI()
            }

        var signedTX = await user_wallet.signTransaction(reqTX);
        var transactionHash = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
        var receipt = await web3.eth.getTransactionReceipt(transactionHash);
        console.log('mintTokensByDAI Tx: '+ receipt)
        mintTokensByDAI(user_wallet);
    }catch(error){
        console.log(error)
        console.log('buy');
        mintTokensByDAI(user_wallet);
    }
    
    
};

main();