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
    // switch(OPERATION){
    //     case 1:
    //         await approve(DAIaddress, user_wallet);
    //         break;
    //     case 2:
    //         await mintTokensByDAI(user_wallet);
    //         break;
    //     case 3:
    //         await createBotAccount();
    //         break;
    // }

    // await approve(DAIaddress, user_wallet);
    // await setMintDAIPrice(user_wallet)
    // await mintTokensByDAI(user_wallet);
    // await createBotAccount();
    await TestProxy(user_wallet);
    
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

const zuckV1ABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Approval",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "string",
				"name": "msg",
				"type": "string"
			}
		],
		"name": "LogShow",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "minTokensBeforeSwap",
				"type": "uint256"
			}
		],
		"name": "MinTokensBeforeSwapUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokensSwapped",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "ethReceived",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokensIntoLiqudity",
				"type": "uint256"
			}
		],
		"name": "SwapAndLiquify",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bool",
				"name": "enabled",
				"type": "bool"
			}
		],
		"name": "SwapAndLiquifyEnabledUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256"
			}
		],
		"name": "Transfer",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "_liquidityDivide",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "_marketDivide",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "_maxTxAmount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "_positionDivide",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "_taxFee",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			}
		],
		"name": "allowance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "approve",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "balanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "decimals",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "excludeBotFromFee",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "excludeFromFee",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getMarketDivideAddress",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getPositionDivideAddress",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getliquifyEnabled",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "includeFee",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "isExcludedFromReward",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "isIncludeFromFee",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "liquifyEnabled",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "pancakeSwapV2Pair",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "pancakeSwapV2Router",
		"outputs": [
			{
				"internalType": "contract IPancakeSwapV2Router02",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "setLiquidDivideAddress",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "liquidityDivide",
				"type": "uint256"
			}
		],
		"name": "setLiquidityDividePercent",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bool",
				"name": "_liquifyEnabled",
				"type": "bool"
			}
		],
		"name": "setLiquifyEnableTrade",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "setMarketDivideAddress",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "marketDivide",
				"type": "uint256"
			}
		],
		"name": "setMarketingDividePercent",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "maxTxPercent",
				"type": "uint256"
			}
		],
		"name": "setMaxTxPercent",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "setPositionDivideAddress",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "positionDivide",
				"type": "uint256"
			}
		],
		"name": "setPositionDividePercent",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "power",
				"type": "uint256"
			}
		],
		"name": "setRadion",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_startMintDate",
				"type": "uint256"
			}
		],
		"name": "setStartTradeDate",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "taxFee",
				"type": "uint256"
			}
		],
		"name": "setTaxFeePercent",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalFees",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalSupply",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "transfer",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "transferFrom",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_var1",
				"type": "uint256"
			}
		],
		"name": "updateVar1",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_var2",
				"type": "uint256"
			}
		],
		"name": "updateVar2",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "var1",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "var2",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
]

async function TestProxy(user_wallet){
    const zuckV1Contract = new web3.eth.Contract(
        zuckV1ABI,
        '0xa070e1b8a8DFa932D1a7A0a7E00981fCd809657b'
    );

    const proxyAddress = '0xD8f01552818FdAa8F421A6DE7347918B8d1955d6'

    tx = zuckV1Contract.methods.updateVar1(10);
    data = tx.encodeABI();
    gas = await tx.estimateGas({from: user_wallet.address});
    gasPrice = await web3.eth.getGasPrice();
    txData = {
      from: user_wallet.address,
      to: proxyAddress,
      data, 
      gas: gas + 50000,
      gasPrice
    };
	var signedTX = await user_wallet.signTransaction(txData);
	var transactionHash = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
	var receipt = await web3.eth.getTransactionReceipt(transactionHash);
	console.log(receipt);

    tx = zuckV1Contract.methods.var1();
    data = tx.encodeABI();
    txData = {
      from: user_wallet.address,
      to: proxyAddress,
      data: data, 
    };
    var1 = await web3.eth.call(txData);
    console.log('va1 is: '+var1)
}

main();