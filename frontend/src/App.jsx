import { useState } from 'react'
import { ethers } from 'ethers'
import LendingPoolABI from './abis/LendingPool.sol/LendingPool.json'
import MockERC20ABI from './abis/MockERC20.sol/MockERC20.json'
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
      setDebtBalance(debt.toString())

      const factor = await lendingPoolContract.getHealthFactor(_walletAddress)
      setHealthFactor((Number(factor) / 10000).toFixed(2))
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
    <div>
      <h1>Lending Protocol</h1>
      {walletAddress ? (
        <div>
          <p>Connected: {walletAddress}</p>
          
          <input
            type="text"
            placeholder="Amount to deposit"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <button onClick={deposit}>Deposit USDC</button>

          <input
            type="text"
            placeholder="Amount to borrow"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
          />
          <button onClick={borrow}>Borrow USDC</button>

          <input
            type="text"
            placeholder="Amount to repay"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
          />
          <button onClick={repayForm}>Repay USDC</button>

          <input
            type="text"
            placeholder="Amount to withdraw"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <button onClick={withdrawForm}>Withdraw USDC</button>

          <button onClick={() => fetchBalances(signer, walletAddress)}>Refresh Balances</button>
          <p>aUSDC Balance: {aTokenBalance}</p>
          <p>Debt Balance: {debtBalance}</p>
          <p>Health Factor: {healthFactor}</p>
        </div>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
    </div>
  )
}
export default App