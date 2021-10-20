const { Console } = require('console');
const ethers = require('ethers');

const privateKey = ""; //Enter wallet private key here
const apiKey = ""; //Enter API key here

const OUT = "0x4e78011ce80ee02d2c3e649fb657e45898257815"; //KLIMA
const MID = "0x2f800db0fdb5223b3c3f354886d907a671414a7f"  //BCT
const IN = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";  //USDC
const swapPath = [IN,MID,OUT];

const router = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; //SushiSwap Router

const provider = new ethers.providers.JsonRpcProvider(apiKey);
const wallet = new ethers.Wallet(privateKey);
const signer = wallet.connect(provider);

//Router contract to receive amounts out and to initiate token swap
const routerContract = new ethers.Contract(
    router,
    [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns(uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) external returns (uint[] amounts)'
    ],
    signer
);

//'Out' token contract to approve spending (Only required once)
const outContract = new ethers.Contract(
    IN,
    [
        'function approve(address spender, uint amount) external returns (bool)'
    ],
    signer
)

async function main() {
    const non = await signer.getTransactionCount();

    //Enter amount in here (currently set to $1,000)
    const amountIn = ethers.utils.parseUnits("1000", 6); 
    let amounts = await routerContract.getAmountsOut(amountIn, swapPath);

    //Amounts out minimum = amounts - (amounts/80) = 1.25% slippage
    const amountOutMin = await amounts[2].sub(amounts[2].div(80)); 

    console.log(ethers.utils.formatEther(amountOutMin));
    console.log(ethers.utils.formatEther(amountIn));

    
    console.log("Approving")
    const approveTx = await outContract.approve(
        router,
        amountIn,
        {nonce:non}
    );
    let reciept = await approveTx.wait();
    console.log(reciept);

    console.log("Swap Starting...");
    const non2 = await signer.getTransactionCount();
    console.log("Transaction Count: "+non2);
    const swapTx = await routerContract.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        swapPath,
        wallet.address,
        Date.now() + 1000 * 60 * 10,
        {
            gasLimit: 300000,
            gasPrice: 50000000000, //50
            nonce: non2
        }
    )
    console.log("Sumbitted Swap");
    let receipt = await swapTx.wait();
    console.log(receipt);
}

main().then().finally(() => {});