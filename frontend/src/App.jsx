import { useState } from 'react'
import { ethers } from 'ethers'
import LendingPoolABI from './abis/LendingPool.sol/LendingPool.json'
import MockERC20ABI from './abis/MockERC20.sol/MockERC20.json'
import InterestRateStrategyABI from './abis/InterestRateStrategy.sol/InterestRateStrategy.json'
import { addresses } from './contracts/addresses'


function App() {
  const [walletAddress, setWalletAddress] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [borrowAmount, setBorrowAmount] = useState('')
  const [aTokenBalance, setATokenBalance] = useState('0')
  const [debtBalance, setDebtBalance] = useState('0')
  const [healthFactor, setHealthFactor] = useState('0')
  const [repayAmount, setRepayAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [borrowRate, setBorrowRate] = useState('0')

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask')
      return
    }
    try{
      const _provider = new ethers.BrowserProvider(window.ethereum)
      const _signer = await _provider.getSigner()
      const address = await _signer.getAddress()
      setProvider(_provider)
      setSigner(_signer)
      setWalletAddress(address)
      await fetchBalances(_signer, address)
    } catch (error) {
      alert('Failed to connect wallet: ' + error.message)
    }
  }


  const deposit = async () => {
    if (!signer) {
      alert('Please connect your wallet first')
      return
    }
    try {
      const usdcContract = new ethers.Contract(addresses.usdc, MockERC20ABI.abi, signer)
      const lendingPoolContract = new ethers.Contract(addresses.lendingPool, LendingPoolABI.abi, signer)
      const amount = ethers.parseUnits(depositAmount, 6)
      const approveTx = await usdcContract.approve(addresses.lendingPool, amount)
      await approveTx.wait()
      const depositTx = await lendingPoolContract.deposit(addresses.usdc, amount)
      await depositTx.wait()
      alert('Deposit successful!')
      await fetchBalances(signer, walletAddress)
    } catch (error) {
      alert('Deposit failed: ' + error.message)
    }
  }

  const borrow = async () => {
    try {
      const lendingPoolContract = new ethers.Contract(addresses.lendingPool, LendingPoolABI.abi, signer)

      const amount = ethers.parseUnits(borrowAmount, 6) // USDC has 6 decimals

      // Borrow USDC
      const borrowTx = await lendingPoolContract.borrow(addresses.usdc, amount)
      await borrowTx.wait()

      alert('Borrow successful!')
      await fetchBalances(signer, walletAddress)
    } catch (error) {
      alert('Borrow failed: ' + error.message)
    }
}

  const fetchBalances = async (_signer, _walletAddress) => {

    try {
      const aTokenContract = new ethers.Contract(addresses.aUsdc, MockERC20ABI.abi, _signer)
      const lendingPoolContract = new ethers.Contract(addresses.lendingPool, LendingPoolABI.abi, _signer)

      const aBalance = await aTokenContract.balanceOf(_walletAddress)
      setATokenBalance(ethers.formatUnits(aBalance, 6))

      const debt = await lendingPoolContract.getUserDebtValue(_walletAddress)
      const debtInTokens = debt / BigInt(100000000)
      setDebtBalance(ethers.formatUnits(debtInTokens, 6))

      const factor = await lendingPoolContract.getHealthFactor(_walletAddress)
      setHealthFactor((Number(factor) / 10000).toFixed(2))

      const interestStrategyContract = new ethers.Contract(addresses.interestStrategy, InterestRateStrategyABI.abi, _signer)
      const totalDeposited = await lendingPoolContract.deposits(addresses.usdc, _walletAddress)
      const _totalBorrows = await lendingPoolContract.totalBorrows(addresses.usdc)
      const _borrowRate = await interestStrategyContract.calculateBorrowRate(_totalBorrows, totalDeposited)
      setBorrowRate((Number(_borrowRate) / 100).toFixed(2) + '%')
    } catch (error) {
      alert('Failed to fetch balances: ' + error.message)
    }
  }

  const repayForm = async () => {
    if (!signer) {
      alert('Please connect your wallet first')
      return
    }
    try {
    const usdcContract = new ethers.Contract(addresses.usdc, MockERC20ABI.abi, signer)
    const lendingPoolContract = new ethers.Contract(addresses.lendingPool, LendingPoolABI.abi, signer)
    
    const amount = ethers.parseUnits(repayAmount, 6) // USDC has 6 decimals
    
    // First approve the LendingPool to spend USDC
    const approveTx = await usdcContract.approve(addresses.lendingPool, amount)
    await approveTx.wait()
    
    // Then repay
    const repayTx = await lendingPoolContract.repay(addresses.usdc, amount)
    await repayTx.wait()
    await fetchBalances(signer, walletAddress)
    alert('repay successful!')
    } catch (error) {
      alert('Repay failed: ' + error.message)
    }
  }

  const withdrawForm = async () => {
    if (!signer) {
      alert('Please connect your wallet first')
      return
    }
    try {
    const lendingPoolContract = new ethers.Contract(addresses.lendingPool, LendingPoolABI.abi, signer)
    const amount = ethers.parseUnits(withdrawAmount, 6) // USDC has 6 decimals
    
    // Withdraw
    const withdrawTx = await lendingPoolContract.withdraw(addresses.usdc, amount)
    await withdrawTx.wait()
    
    alert('Withdraw successful!')
    await fetchBalances(signer, walletAddress)
    } catch (error) {
      alert('Withdraw failed: ' + error.message)
    }
  }



  return (
  <div className="min-h-screen bg-[#0d0f14] text-gray-200">
    <nav className="flex justify-between items-center px-8 py-4 border-b border-[#1e2130]">
      <h1 className="text-[#4cff72] text-xl font-bold">Lending Protocol</h1>
      {walletAddress ? (
        <span className="text-[#4cff72] text-sm font-medium">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </span>
      ) : (
        <button
          onClick={connectWallet}
          className="border border-[#4cff72] text-[#4cff72] px-5 py-2 rounded-lg font-semibold text-sm hover:bg-[#4cff72] hover:text-[#0d0f14] transition"
        >
          Connect Wallet
        </button>
      )}
    </nav>

    {walletAddress && (
        <div className="max-w-5xl mx-auto mt-10 px-6 grid grid-cols-2 gap-6">
          <div className="bg-[#151821] border border-[#1e2130] rounded-2xl p-6">
            <h2 className="text-[#4cff72] text-lg font-semibold mb-4">Deposit</h2>
            <input
              type="text"
              placeholder="Amount to deposit"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full bg-[#1e2130] border border-[#2a2f45] text-gray-200 placeholder-gray-600 px-4 py-3 rounded-lg text-sm mb-3 outline-none focus:border-[#4cff72]"
            />
            <button onClick={deposit} className="w-full bg-[#4cff72] text-[#0d0f14] font-bold py-3 rounded-lg hover:bg-[#3de063] transition">
              Deposit USDC
            </button>
          </div>

          <div className="bg-[#151821] border border-[#1e2130] rounded-2xl p-6">
            <h2 className="text-[#4cff72] text-lg font-semibold mb-4">Borrow</h2>
            <input
              type="text"
              placeholder="Amount to borrow"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              className="w-full bg-[#1e2130] border border-[#2a2f45] text-gray-200 placeholder-gray-600 px-4 py-3 rounded-lg text-sm mb-3 outline-none focus:border-[#4cff72]"
            />
            <button onClick={borrow} className="w-full bg-[#4cff72] text-[#0d0f14] font-bold py-3 rounded-lg hover:bg-[#3de063] transition">
              Borrow USDC
            </button>
          </div>

          <div className="bg-[#151821] border border-[#1e2130] rounded-2xl p-6">
            <h2 className="text-[#4cff72] text-lg font-semibold mb-4">Repay</h2>
            <input
              type="text"
              placeholder="Amount to repay"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              className="w-full bg-[#1e2130] border border-[#2a2f45] text-gray-200 placeholder-gray-600 px-4 py-3 rounded-lg text-sm mb-3 outline-none focus:border-[#4cff72]"
            />
            <button onClick={repayForm} className="w-full bg-[#4cff72] text-[#0d0f14] font-bold py-3 rounded-lg hover:bg-[#3de063] transition">
              Repay USDC
            </button>
          </div>

          <div className="bg-[#151821] border border-[#1e2130] rounded-2xl p-6">
            <h2 className="text-[#4cff72] text-lg font-semibold mb-4">Withdraw</h2>
            <input
              type="text"
              placeholder="Amount to withdraw"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full bg-[#1e2130] border border-[#2a2f45] text-gray-200 placeholder-gray-600 px-4 py-3 rounded-lg text-sm mb-3 outline-none focus:border-[#4cff72]"
            />
            <button onClick={withdrawForm} className="w-full bg-[#4cff72] text-[#0d0f14] font-bold py-3 rounded-lg hover:bg-[#3de063] transition">
              Withdraw USDC
            </button>
          </div>

          <div className="bg-[#151821] border border-[#1e2130] rounded-2xl p-6 col-span-2 flex gap-10 items-center">
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 text-xs uppercase tracking-wider">aUSDC Balance</span>
              <span className="text-gray-200 text-xl font-semibold">{aTokenBalance}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Debt Balance</span>
              <span className="text-gray-200 text-xl font-semibold">{debtBalance}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Health Factor</span>
              <span className="text-gray-200 text-xl font-semibold">{healthFactor}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Borrow APY</span>
              <span className="text-gray-200 text-xl font-semibold">{borrowRate}</span>
            </div>
            <button
              onClick={() => fetchBalances(signer, walletAddress)}
              className="ml-auto border border-[#2a2f45] text-[#4cff72] px-5 py-2 rounded-lg font-semibold text-sm hover:bg-[#1e2130] transition"
            >
              Refresh Balances
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default App