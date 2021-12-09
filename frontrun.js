/**
 * Perform a front-running attack on pancakeswap
*/
var Web3 = require('web3');
var abiDecoder = require('abi-decoder');
var colors = require("colors");
var Tx = require('ethereumjs-tx').Transaction;
var axios = require('axios');
var BigNumber = require('big-number');

const {PANCAKE_ROUTER_ADDRESS, PANCAKE_FACTORY_ADDRESS, PANCAKE_ROUTER_ABI, PANCAKE_FACTORY_ABI,
     PANCAKE_POOL_ABI, HTTP_PROVIDER_LINK, WEBSOCKET_PROVIDER_LINK} = require('./constants.js');

const {PRIVATE_KEY, TOKEN_ADDRESS_ARRAY, BNB_AMOUNT, RATION_ARRAY} = require('./env.js');

const INPUT_TOKEN_ADDRESS = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

const ONE_GWEI = 1e9;

var web3;
var web3Ws;
var pancakeRouter;
var pancakeFactory;
var subscription;
var bnbTokenInfo;

buy_finished = false;
sell_finished = false;
buy_failed = false;
sell_failed = false;

var TOKENDIC = {};

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
    try {   
            if (await createWeb3() == false) {
                console.log('Web3 Create Error'.yellow);
                process.exit();
            }
            
            const user_wallet = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
            var ret= prepareInputTokenInfo(user_wallet);
            if(!ret){
                process.exit();
            }

            var ret = prepareOutputTokenInfo(user_wallet)
            if(!ret){
                process.exit();
            }
            
            targetTokenAddrs = Object.keys(TOKENDIC);

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
    var selectedTokenAddr = await triggerToParseTx(transaction,targetTokenAddrs);
    if(selectedTokenAddr!=null){
        console.log('trigger to Attack tx'.red);
        // triggerToAttackTx(transaction,selectedTokenAddr,user_wallet)
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
            let txOutMin = params[0].value;
            let txPath = params[1].value;
            let txInTokenAddr = txPath[0];
            let txOutTokenAddr = txPath[txPath.length-1];
            let txReceiverAddr = params[2].value;
            let txDeadline = params[3].value;

            if(!targetTokenAddrs.includes(txOutTokenAddr))
            {
                return false;
            } 

            await updatePoolInfo(txOutTokenAddr);
            console.log('-----------------------------------------------------------------------------------------------------'.yellow);
            let tokenDetail = TOKENDIC[txOutTokenAddr];
            let poolInfo = tokenDetail['poolInfo'];
            let log_str = "swap ExactETH For Tokens" + '\t\t' +(poolInfo.thresholdAmount/(10**bnbTokenInfo.decimals)).toFixed(3) + ' ' + bnbTokenInfo.symbol + '\t' + (poolInfo.bnbBalance/(10**bnbTokenInfo.decimals)).toFixed(3) + ' ' + bnbTokenInfo.symbol;
            console.log(log_str.green);

            log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (txInAmount/(10**bnbTokenInfo.decimals)).toFixed(3) + '\t' + bnbTokenInfo.symbol 
            if(txInAmount >= poolInfo.thresholdAmount)
            {
                console.log(log_str.red);
                return txOutTokenAddr;
            }   
            console.log(log_str);
        }
        else if (method == 'swapETHForExactTokens'){

            let txInMax = transaction.value;
            let txOutAmount = params[0].value;
            let txPath = params[1].value;
            let txInTokenAddr = txPath[0];
            let txOutTokenAddr = txPath[txPath.length-1];
            let txReceiverAddr = params[2].value;
            let txDeadline = params[3].value;

            if(!targetTokenAddrs.includes(txOutTokenAddr))
            {
                return false;
            } 
        
            await updatePoolInfo(txOutTokenAddr);
            console.log('-----------------------------------------------------------------------------------------------------'.yellow);
            let tokenDetail = TOKENDIC[txOutTokenAddr];
            let poolInfo = tokenDetail['poolInfo'];
            let log_str = "swap ETH For ExactTokens" + '\t\t' +(poolInfo.thresholdAmount/(10**bnbTokenInfo.decimals)).toFixed(3) + ' ' + bnbTokenInfo.symbol + '\t' + (poolInfo.bnbBalance/(10**bnbTokenInfo.decimals)).toFixed(3) + ' ' + bnbTokenInfo.symbol;
            console.log(log_str.green);
            
            log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (txInMax/(10**bnbTokenInfo.decimals)).toFixed(3) + '\t' + bnbTokenInfo.symbol + '(max)' 
            if(txInMax >= poolInfo.thresholdAmount)
            {
                console.log(log_str.red);
                return txOutTokenAddr;
            }   
            console.log(log_str);
        }
        else if(method == 'swapExactTokensForTokens')
        {
            let txInAmount = params[0].value;
            let txOutMin = params[1].value;
            let txPath = params[2].value;
            let txInTokenAddr = txPath[txPath.length-2];
            let txOutTokenAddr = txPath[txPath.length-1];
            let txReceiverAddr = params[3].value;
            let txDeadline = params[4].value;

            if(!targetTokenAddrs.includes(txOutTokenAddr))
            {
                return false;
            } 
            await updatePoolInfo(txOutTokenAddr);
            let amounts = await pancakeRouter.methods.getAmountsOut(txOutMin.toString(), [txOutTokenAddr,INPUT_TOKEN_ADDRESS]).call();
            console.log('-----------------------------------------------------------------------------------------------------'.yellow);
            let calcEth = amounts[1];
            let tokenDetail = TOKENDIC[txOutTokenAddr];
            let poolInfo = tokenDetail['poolInfo'];
            let log_str = "swap ExactTokens For Tokens" + '\t\t' +(poolInfo.thresholdAmount/(10**bnbTokenInfo.decimals)).toFixed(3) + ' ' + bnbTokenInfo.symbol + '\t' + (calcEth/(10**bnbTokenInfo.decimals)).toFixed(3) + ' ' + bnbTokenInfo.symbol;
            console.log(log_str.green);

            log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (calcEth/(10**bnbTokenInfo.decimals)).toFixed(3) + '\t' + bnbTokenInfo.symbol + '(min)';
            
            if(calcEth >= poolInfo.thresholdAmount)
            {
                console.log(log_str.red);
                return txOutTokenAddr;
            }   
            console.log(log_str);
        }
        else if(method == 'swapTokensForExactTokens')
        {
            let txOutAmount = params[0].value;
            let txInMax = params[1].value;
            
            let txPath = params[2].value;
            let txInTokenAddr = path[path.length-2];
            let txOutTokenAddr = path[path.length-1];

            let txReceiverAddr = params[3].value;
            let txDeadline = params[4].value;


            if(!targetTokenAddrs.includes(txOutTokenAddr))
            {
                return false;
            } 
            await updatePoolInfo(txOutTokenAddr);
            let amounts = await pancakeRouter.methods.getAmountsOut(out_amount.toString(), [TOKEN_ADDRESS,INPUT_TOKEN_ADDRESS]).call();
            console.log('-----------------------------------------------------------------------------------------------------'.yellow);
            var calcEth = amounts[1];
            let tokenDetail = TOKENDIC[txOutTokenAddr];
            let poolInfo = tokenDetail['poolInfo'];
            let log_str = "swap Tokens For ExactTokens Volumn" + '\t\t' +(poolInfo.thresholdAmount/(10**bnbTokenInfo.decimals)).toFixed(3) + ' ' + bnbTokenInfo.symbol + '\t' + (calcEth/(10**bnbTokenInfo.decimals)).toFixed(3) + ' ' + bnbTokenInfo.symbol;
            console.log(log_str.green);
            log_str = transaction['hash'] +'\t' + gasPrice.toFixed(2) + '\tGWEI\t' + (calcEth/(10**bnbTokenInfo.decimals)).toFixed(3) + '\t' + bnbTokenInfo.symbol + '(max)';
            
            if(calcEth >= poolInfo.thresholdAmount)
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

async function triggerToAttackTx(transaction,selectedTokenAddr,user_wallet){
    if(subscription!=null){
        subscription.unsubscribe();
    }
    try{
        console.log('Perform front running attack...');

        let gasPrice = parseInt(transaction['gasPrice']);
        let newGasPrice = gasPrice + 50*ONE_GWEI;
        console.log('Victim Tx gas price: '+ gasPrice/ONE_GWEI);
        console.log('New Front Tx gas price: '+ newGasPrice/ONE_GWEI);
        var estimatedInput = ((BNB_AMOUNT*0.999)*(10**18)).toString();
        var realInput = (BNB_AMOUNT*(10**18)).toString();
        var gasLimit = (300000).toString();

        await updatePoolInfo(selectedTokenAddr);
        
        let outputAmount = await pancakeRouter.methods.getAmountsOut(estimatedInput, [INPUT_TOKEN_ADDRESS,selectedTokenAddr]).call();
        console.log('Output Token Amount is: '+ (outputAmount[1]/(10**18)).toString())
        //0 is Buy
        swap(newGasPrice, gasLimit, outputAmount[1], realInput, 0, selectedTokenAddr, user_wallet, transaction);

        console.log("wait until the honest transaction is done...", transaction['hash']);

        while (await isPendingTx(transaction['hash'])) {
        }

        if(buy_failed)
        {
            succeed = false;
            return;
        }   
        
        console.log('Buy succeed:')
        
        await updatePoolInfo(selectedTokenAddr);
        let bnbAmount = await pancakeRouter.methods.getAmountsOut(outputAmount[1], [selectedTokenAddr,INPUT_TOKEN_ADDRESS]).call();
        bnbAmount = bnbAmount * 0.999;

        console.log('outputETH is: '+ (bnbAmount/10**18).toString)

         //1 is Sell
        await swap(newGasPrice, gasLimit, outputAmount[1], bnbAmount, 1, selectedTokenAddr, user_wallet, transaction);
        
        console.log('Sell succeed');
    }catch(error){
        console.log(error.toString());
    }    
}

async function swap(gasPrice, gasLimit, tokenAmount, bnbAmount, trade, tokenAddr, user_wallet, transaction) {
    var from = user_wallet;
    var deadline;
    var swap;

    await web3.eth.getBlock('lastest', (error, block) => {
        deadline = block.timestamp + 300; // transaction expires in 300 seconds (5 minutes)
    });

    deadline = web3.utils.toHex(deadline);
    
    if(trade == 0) { //buy
        let tokenDetail = TOKENDIC[tokenAddr];
        let tokenInfo = tokenDetail['tokenInfo'];

        console.log('Get_Amount: '.red, (tokenAmount/(10**tokenInfo.decimals)).toFixed(3) + ' ' + tokenInfo.symbol);

        swap = pancakeRouter.methods.swapETHForExactTokens(bnbAmount.toString(), [INPUT_TOKEN_ADDRESS, tokenAddr], from.address, deadline);
        var encodedABI = swap.encodeABI();

        var tx = {
            from: from.address,
            to: PANCAKE_ROUTER_ADDRESS,
            gas: gasLimit,
            gasPrice: gasPrice,
            data: encodedABI,
            value: bnbAmount
          };
    } else { //sell
        console.log('Get_Min_Amount '.yellow, (tokenAmount/(10**bnbTokenInfo.decimals)).toFixed(3) + ' ' + bnbTokenInfo.symbol);

        swap = pancakeRouter.methods.swapExactTokensForETH(tokenAmount.toString(), bnbAmount.toString(), [tokenAddr, INPUT_TOKEN_ADDRESS], from.address, deadline);
        var encodedABI = swap.encodeABI();

        var tx = {
            from: from.address,
            to: PANCAKE_ROUTER_ADDRESS,
            gas: gasLimit,
            gasPrice: gasPrice,
            data: encodedABI,
            value: 0*10**18
          };
    }

    var signedTx = await from.signTransaction(tx);

    if(trade == 0) {
        let is_pending = await isPending(transaction['hash']);
        if(!is_pending) {
            console.log("The transaction you want to attack has already been completed!!!");
            process.exit();
        }
    }

    console.log('====signed transaction=====', gasLimit, gasPrice)
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    .on('transactionHash', function(hash){
        console.log('swap : ', hash);
    })
    .on('confirmation', function(confirmationNumber, receipt){
        if(trade == 0){
          buy_finished = true;
        }
        else{
          sell_finished = true;   
        }
    })
    .on('receipt', function(receipt){

    })
    .on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
        if(trade == 0){
          buy_failed = true;
          console.log('Attack failed(buy)')
        }
        else{
          sell_failed = true;   
          console.log('Attack failed(sell)')
        }
    });
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

async function approve(gasPrice, outputAmount, tokenAddr, user_wallet){
    var tokenInfo = TOKENDIC[tokenAddr];
    var allowance = await tokenInfo.contract.methods.allowance(user_wallet.address, PANCAKE_ROUTER_ADDRESS).call();
    
    allowance = BigNumber(allowance);
    outputAmount = BigNumber(outputAmount);
    max_allowance = allowance;
    if(allowance< outputAmount){
        max_allowance = outputAmount;
    }
    var approveTX ={
        from: user_wallet.address,
        to: tokenAddr,
        gas: 50000,
        gasPrice: gasPrice*ONE_GWEI,
        data: tokenInfo.contract.methods.approve(PANCAKE_ROUTER_ADDRESS, max_allowance).encodeABI()
    }

    var signedTX = await user_wallet.signTransaction(approveTX);
    var transactionHash = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
    var receipt = await web3.eth.getTransactionReceipt(transactionHash);
    console.log('Approved Token Tx: '+ receipt.toString());
};

async function prepareInputTokenInfo(user_wallet){
    try{
        var log_str = '***** Your Wallet Balance *****'
        console.log(log_str.green);
        log_str = 'wallet address:\t' + user_wallet.address;
        console.log(log_str.white);

        bnbTokenInfo = await getBNBInfo(user_wallet);
        log_str = (bnbTokenInfo.balance/(10**bnbTokenInfo.decimals)).toFixed(5) +'\t'+bnbTokenInfo.symbol;
        console.log(log_str);

        if(bnbTokenInfo.balance < (BNB_AMOUNT+0.05) * (10**18)) {
            console.log("INSUFFICIENT_BALANCE!".yellow);
            log_str = 'Your wallet balance must be more ' + BNBAMOUNT + bnbTokenInfo.symbol + '(+0.05 BNB:GasFee) ';
            console.log(log_str.red)            
            return false;
        }
        return true;

    }catch(error){
        console.log('Failed to Prepare BNB token Info '+error.toString())
        return false;
    }
    

}

async function prepareOutputTokenInfo(user_wallet){
    try{
        for(var i=0;i<TOKEN_ADDRESS_ARRAY.length;i++){
            var tokenAddr = TOKEN_ADDRESS_ARRAY[i];
            var ration = RATION_ARRAY[i];
            var tokenABIReq = 'https://api.bscscan.com/api?module=contract&action=getabi&address='+tokenAddr+'&apikey=UBF988MHCNUXD5IZ9J5BJBF9GZUSC9CCTV';
            var tokenInfo = await getTokenInfo(tokenAddr, tokenABIReq, user_wallet);    
            if(tokenInfo == null) {
              process.exit();
            }
            var poolInfo = await getPoolInfo(INPUT_TOKEN_ADDRESS, tokenAddr)
            if(poolInfo == null) {
                process.exit();
            }
            var tokenDetail = {
                'ration':ration,
                'tokenInfo':tokenInfo,
                'poolInfo':poolInfo
            }
            TOKENDIC[tokenAddr] = tokenDetail;
            await updatePoolInfo(tokenAddr);
            var estimateTokenAmounts = await pancakeRouter.methods.getAmountsOut(((BNB_AMOUNT*1.5)*(10**18)).toString(),[INPUT_TOKEN_ADDRESS,outTokenAddr]).call();
            console.log(BNB_AMOUNT+' get token estimate amounts: '+estimateTokenAmounts[1]/ 10**18+' used for approving');
    
            var middleGasPrice = 6;
            // await approve(middleGasPrice, estimateTokenAmounts, outTokenAddr, user_wallet);
        }
        return true;
    
    }catch(error){
        console.log('Failed to Prepare Token info '+ error.toString())
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
        poolInfo.thresholdAmount = eth_balance * (poolInfo.ration); 
        return true;

    }catch (error) {
        console.log('Failed To Update Pool Info'.yellow);
        return false;
    }
}

async function getBNBInfo(user_wallet){
    var balance = await web3.eth.getBalance(user_wallet.address);
    var decimals = 18;
    var symbol = 'BNB';

    return {'balance': balance, 'symbol': symbol, 'decimals': decimals}
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
        var balance = await token_contract.methods.balanceOf(user_wallet.address).call();
        var decimals = await token_contract.methods.decimals().call();
        var symbol =  await token_contract.methods.symbol().call();
        return {'contract': tokenContract, 'balance': balance, 'symbol': symbol, 'decimals': decimals}
    }catch(error){
        console.log('Failed Get Token Info');
        return null;
    }
}

async function getPoolInfo(inputTokenAddr, outTokenAddr){
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

        var thresholdAmount = bnbBalance * (level/100);
        return {'contract': poolContract, 'forward': forward, 'bnbBalance': bnbBalance, 'tokenBalance': tokenBalance, 'thresholdAmount': thresholdAmount}

    }catch(error){
        console.log('Error: Get Pari Info'+error.toString());
        return null;
    }
}



main();