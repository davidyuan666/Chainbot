/**
 * Perform a new pair sniper on pancakeswap
*/
var Web3 = require('web3');
var abiDecoder = require('abi-decoder');
var colors = require("colors");
var Tx = require('ethereumjs-tx').Transaction;
var axios = require('axios');
var BigNumber = require('big-number');

const {PANCAKE_ROUTER_ADDRESS, PANCAKE_FACTORY_ADDRESS, PANCAKE_ROUTER_ABI, PANCAKE_FACTORY_ABI,
    PANCAKE_POOL_ABI, HTTP_PROVIDER_LINK, WEBSOCKET_PROVIDER_LINK} = require('./constants.js');

const {PRIVATE_KEY, TOKEN_ADDRESS_ARRAY,BNB_AMOUNT, RATION_ARRAY} = require('./env.js');
const INPUT_TOKEN_ADDRESS = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

const ONE_GWEI = 1e9;
var web3;
var web3Ws;
var pancakeRouter;
var pancakeFactory;
var subscription;
var bnbTokenInfo;

async function createWeb3(){
    try {
        web3 = new Web3(new Web3.providers.HttpProvider(HTTP_PROVIDER_LINK));
        web3Ws = new Web3(new Web3.providers.WebsocketProvider(WEBSOCKET_PROVIDER_LINK));
        pancakeRouter = new web3.eth.Contract(PANCAKE_ROUTER_ABI, PANCAKE_ROUTER_ADDRESS);
        pancakeFactory = new web3.eth.Contract(PANCAKE_FACTORY_ABI, PANCAKE_FACTORY_ADDRESS);
        abiDecoder.addABI(PANCAKE_ROUTER_ABI);
        return true;
    } catch (error) {
      console.log(error);
      return false;
    }
}

async function main() {
    try{
        if (await createWeb3() == false) {
            console.log('Web3 Create Error'.yellow);
            process.exit();
        }

        const user_wallet = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);

        var log_str = '***** Sniper New Pair Created *****'
        console.log(log_str.green);


        subscription = web3Ws.eth.subscribe('pendingTransactions', function (error, result) {
        })
        .on('open',()=>{
            console.log('The websocket connection is open');
        })
        .on("data", async function (transactionHash) {
            let transaction = await web3Ws.eth.getTransaction(transactionHash);
            if (transaction != null && transaction['to'] == PANCAKE_ROUTER_ADDRESS)
            {
                await handleTransaction(transaction, user_wallet);
            }
        })
        .on('close',()=>{
            console.log('The websocket connection was closed')
        })

    }catch(error){
        console.log(error.toString());
    }

}

async function handleTransaction(transaction,user_wallet) {
    var txTokenInfo = await triggerToParseTx(transaction);
    if(txTokenInfo!=null){
        var tokenAddr = txTokenInfo['TokenAddr'];
        var tokenMinAmount = txTokenInfo['TokenMinAmount'];
        var ethMinAmount = txTokenInfo['ETHMinAmount'];
        var apiTokenInfo = await rugCheck(tokenAddr)
        if(apiTokenInfo!=null){
            var symbol = apiTokenInfo['symbol'];
            var decimals = apiTokenInfo['decimals'];
            var tokenAmount = tokenMinAmount/ 10**decimals;
            var ethMinAmount = ethMinAmount/10**18;
            var currentTime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');   
            var log_str = currentTime+': '+ tokenAddr+'  '+symbol+': '+tokenAmount+'  '+'BNB: '+ethMinAmount;
            console.log(log_str.yellow);
        }
        // await triggerToMakeProfit(transaction,newTokenInfo,user_wallet)
    }
}

async function triggerToParseTx(transaction) {
    try{
        let data = parseTx(transaction['input']);
        let method = data[0];
        let params = data[1];
        let gasPrice = parseInt(transaction['gasPrice']) / 10**9;

        
        if(method == 'addLiquidityETH')
        {
            let txTokenAddr = params[0].value;
            let txAmountTokenDesired = params[1].value;
            let txAmountTokenMin = params[2].value;
            let txAmountETHMin = params[3].value;
            let txToAddr = params[4].value;
            return {'TokenAddr':txTokenAddr,'TokenMinAmount':txAmountTokenMin,'ETHMinAmount':txAmountETHMin};
        }
        return null;

    }catch(error)
    {
        console.log(error.toString());
        return null;
    }
}

function parseTx(input) {
    try{
        if (input == '0x')
            return ['0x', []]

        let decodedData = abiDecoder.decodeMethod(input);
        let method = decodedData['name'];
        let params = decodedData['params'];

        return [method, params];
    }catch(error){
        console.log(error);
        return [null,null];
    }

}

async function triggerToMakeProfit(transaction,newTokenInfo,user_wallet){
    if(subscription!=null){
        subscription.unsubscribe();
    }
    var log_str = '***** Start to Make Profit *****'
    console.log(log_str.red);

    try{
        
    }catch(error){
        console.log(error.toString());
    }    
}


async function rugCheck(tokenAddr){
    try{
        var tokenABIReq = 'https://api.bscscan.com/api?module=contract&action=getabi&address='+tokenAddr+'&apikey=UBF988MHCNUXD5IZ9J5BJBF9GZUSC9CCTV'; 
        var response = await axios.get(tokenABIReq);
        if(response.data.status==0)
        {
            console.log('Invalid Token Address !')   
            return null;
        }   
        var tokenAbi = response.data.result;
        var tokenContract = new web3.eth.Contract(JSON.parse(tokenAbi), tokenAddr);
        var decimals = await tokenContract.methods.decimals().call();
        var symbol =  await tokenContract.methods.symbol().call();
        return {'decimals':decimals,'symbol':symbol}

    }catch(error){
        console.log(error.toString())
        return null;
    }
}

main();