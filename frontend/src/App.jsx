import { useState } from 'react'
import { ethers } from 'ethers'
import LendingPoolABI from './abis/LendingPool.sol/LendingPool.json'
import MockERC20ABI from './abis/MockERC20.sol/MockERC20.json'
import InterestRateStrategyABI from './abis/InterestRateStrategy.sol/InterestRateStrategy.json'
import { addresses } from './contracts/addresses'
import YieldFarmABI from './abis/YieldFarm.sol/YieldFarm.json'


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
  const [selectedToken, setSelectedToken] = useState('usdc')
  const [stakeAmount, setStakeAmount] = useState('')
  const [stakedBalance, setStakedBalance] = useState('0')
  const [pendingRewards, setPendingRewards] = useState('0')
  const [loading, setLoading] = useState(false)

  const tokens = {
    usdc: { label: 'USDC', token: addresses.usdc, aToken: addresses.aUsdc, dToken: addresses.dUsdc, decimals: 6 },
    weth: { label: 'WETH', token: addresses.weth, aToken: addresses.aWeth, dToken: addresses.dWeth, decimals: 18 },
    wbtc: { label: 'WBTC', token: addresses.wbtc, aToken: addresses.aWbtc, dToken: addresses.dWbtc, decimals: 8 },
    matic: { label: 'MATIC', token: addresses.matic, aToken: addresses.aMatic, dToken: addresses.dMatic, decimals: 18 },
  }

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
      setLoading(true)
      const selected = tokens[selectedToken]
      const usdcContract = new ethers.Contract(selected.token, MockERC20ABI.abi, signer)
      const lendingPoolContract = new ethers.Contract(addresses.lendingPool, LendingPoolABI.abi, signer)
      const amount = ethers.parseUnits(depositAmount, selected.decimals)
      const approveTx = await usdcContract.approve(addresses.lendingPool, amount)
      await approveTx.wait()
      const depositTx = await lendingPoolContract.deposit(selected.token, amount)
      await depositTx.wait()
      alert('Deposit successful!')
      await fetchBalances(signer, walletAddress)
    } catch (error) {
      alert('Deposit failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const borrow = async () => {
    if (!signer) {
      alert('Please connect your wallet first')
      return
    }
    try {
      setLoading(true)
      const selected = tokens[selectedToken]
      const lendingPoolContract = new ethers.Contract(addresses.lendingPool, LendingPoolABI.abi, signer)

      const amount = ethers.parseUnits(borrowAmount, selected.decimals)

      // Borrow USDC
      const borrowTx = await lendingPoolContract.borrow(selected.token, amount)
      await borrowTx.wait()

      alert('Borrow successful!')
      await fetchBalances(signer, walletAddress)
    } catch (error) {
      alert('Borrow failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchBalances = async (_signer, _walletAddress) => {

    try {
      setLoading(true)
      const selected = tokens[selectedToken]
      const aTokenContract = new ethers.Contract(selected.aToken, MockERC20ABI.abi, _signer)
      const lendingPoolContract = new ethers.Contract(addresses.lendingPool, LendingPoolABI.abi, _signer)

      const aBalance = await aTokenContract.balanceOf(_walletAddress)
      setATokenBalance(ethers.formatUnits(aBalance, 6))

      const debt = await lendingPoolContract.getUserDebtValue(_walletAddress)
      const debtInTokens = debt / BigInt(100000000)
      setDebtBalance(ethers.formatUnits(debtInTokens, 6))

      const factor = await lendingPoolContract.getHealthFactor(_walletAddress)
      setHealthFactor((Number(factor) / 10000).toFixed(2))

      const interestStrategyContract = new ethers.Contract(addresses.interestStrategy, InterestRateStrategyABI.abi, _signer)
      const totalDeposited = await lendingPoolContract.deposits(selected.token, _walletAddress)
      const _totalBorrows = await lendingPoolContract.totalBorrows(selected.token)
      const _borrowRate = await interestStrategyContract.calculateBorrowRate(_totalBorrows, totalDeposited)
      setBorrowRate((Number(_borrowRate) / 100).toFixed(2) + '%')
    } catch (error) {
      alert('Failed to fetch balances: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const repayForm = async () => {
    if (!signer) {
      alert('Please connect your wallet first')
      return
    }
    try {
      setLoading(true)
      const selected = tokens[selectedToken]
      const usdcContract = new ethers.Contract(selected.token, MockERC20ABI.abi, signer)
      const lendingPoolContract = new ethers.Contract(addresses.lendingPool, LendingPoolABI.abi, signer)
      
      const amount = ethers.parseUnits(repayAmount, selected.decimals)
      
      // First approve the LendingPool to spend USDC
      const approveTx = await usdcContract.approve(addresses.lendingPool, amount)
      await approveTx.wait()
      
      // Then repay
      const repayTx = await lendingPoolContract.repay(selected.token, amount)
      await repayTx.wait()
      await fetchBalances(signer, walletAddress)
      alert('repay successful!')
      setLoading(false)
    } catch (error) {
      alert('Repay failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const withdrawForm = async () => {
    if (!signer) {
      alert('Please connect your wallet first')
      return
    }
    try {
      setLoading(true)
      const selected = tokens[selectedToken]
      const lendingPoolContract = new ethers.Contract(addresses.lendingPool, LendingPoolABI.abi, signer)
      const amount = ethers.parseUnits(withdrawAmount, selected.decimals)
      
      // Withdraw
      const withdrawTx = await lendingPoolContract.withdraw(selected.token, amount)
      await withdrawTx.wait()
      
      alert('Withdraw successful!')
      await fetchBalances(signer, walletAddress)
    } catch (error) {
      alert('Withdraw failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const stakeForm = async () => {
    if (!signer) {
      alert('Please connect your wallet first')
      return
    }
    try {
      setLoading(true)
      const yieldFarmContract = new ethers.Contract(addresses.yieldFarm, YieldFarmABI.abi, signer)
      const aTokenContract = new ethers.Contract(tokens[selectedToken].aToken, MockERC20ABI.abi, signer)
      
      const amount = ethers.parseUnits(stakeAmount, tokens[selectedToken].decimals)

      // Approve YieldFarm to spend aTokens
      const approveTx = await aTokenContract.approve(addresses.yieldFarm, amount)
      await approveTx.wait()

      // Stake in YieldFarm
      const stakeTx = await yieldFarmContract.stake(amount)
      await stakeTx.wait()

      alert('Stake successful!')
      await fetchBalances(signer, walletAddress)
    } catch (error) {
      alert('Stake failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const unstakeForm = async () => {
    if (!signer) {
      alert('Please connect your wallet first')
      return
    }
    try {
      setLoading(true)
      const yieldFarmContract = new ethers.Contract(addresses.yieldFarm, YieldFarmABI.abi, signer)
      
      const amount = ethers.parseUnits(stakeAmount, tokens[selectedToken].decimals)

      // Unstake from YieldFarm
      const unstakeTx = await yieldFarmContract.unstake(amount)
      await unstakeTx.wait()

      alert('Unstake successful!')
      await fetchBalances(signer, walletAddress)
    } catch (error) {
      alert('Unstake failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const claimRewards = async () => {
    if (!signer) {
      alert('Please connect your wallet first')
      return
    }
    try {
      setLoading(true)
      const yieldFarmContract = new ethers.Contract(addresses.yieldFarm, YieldFarmABI.abi, signer)

      // Claim rewards
      const claimTx = await yieldFarmContract.claimReward()
      await claimTx.wait()

      alert('Rewards claimed successfully!')
      await fetchBalances(signer, walletAddress)
    } catch (error) {
      alert('Claiming rewards failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchYieldFarmBalance = async () => {
    try {
      setLoading(true)      
      const yieldFarmContract = new ethers.Contract(addresses.yieldFarm, YieldFarmABI.abi, signer)

      const staked = await yieldFarmContract.stakedBalance(walletAddress)
      setStakedBalance(ethers.formatUnits(staked, tokens[selectedToken].decimals))

      const rewards = await yieldFarmContract.calculateReward(walletAddress)
      setPendingRewards(ethers.formatUnits(rewards, 18))
    } catch (error) {
      alert('Failed to fetch yield farm balances: ' + error.message)  
    } finally {
      setLoading(false)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    setSigner(null)
    setProvider(null)
    setATokenBalance('0')
    setDebtBalance('0')
    setHealthFactor('0')
    setBorrowRate('0')
    setStakedBalance('0')
    setPendingRewards('0')
  }




  return (
    <div className="min-h-screen bg-[#0d0f14] text-gray-200">
      <nav className="flex justify-between items-center px-8 py-4 border-b border-[#1e2130]">
        <h1 className="text-[#4cff72] text-xl font-bold">Lending Protocol</h1>
        {walletAddress ? (
          <div className="flex items-center gap-4">
            <span className="text-[#4cff72] text-sm font-medium">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
            <button
              onClick={disconnectWallet}
              className="border border-red-500 text-red-500 px-5 py-2 rounded-lg font-semibold text-sm hover:bg-red-500 hover:text-white transition"
            >
              Disconnect
            </button>
          </div>
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
        <div className="max-w-5xl mx-auto mt-10 px-6">
          <div className="mb-6">
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="bg-[#1e2130] border border-[#2a2f45] text-gray-200 px-4 py-2 rounded-lg text-sm outline-none"
            >
              {Object.entries(tokens).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#151821] border border-[#1e2130] rounded-2xl p-6">
              <h2 className="text-[#4cff72] text-lg font-semibold mb-4">Deposit</h2>
              <input
                type="text"
                placeholder="Amount to deposit"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-[#1e2130] border border-[#2a2f45] text-gray-200 placeholder-gray-600 px-4 py-3 rounded-lg text-sm mb-3 outline-none focus:border-[#4cff72]"
              />
              <button onClick={deposit} className="w-full bg-[#4cff72] text-[#0d0f14] font-bold py-3 rounded-lg hover:bg-[#3de063] transition" disabled={loading}>
                {loading ? 'Processing...' : `Deposit ${tokens[selectedToken].label}`}
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
              <button onClick={borrow} className="w-full bg-[#4cff72] text-[#0d0f14] font-bold py-3 rounded-lg hover:bg-[#3de063] transition" disabled={loading}>
                {loading ? 'Processing...' : `Borrow ${tokens[selectedToken].label}`}
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
              <button onClick={repayForm} className="w-full bg-[#4cff72] text-[#0d0f14] font-bold py-3 rounded-lg hover:bg-[#3de063] transition" disabled={loading}>
                {loading ? 'Processing...' : `Repay ${tokens[selectedToken].label}`}
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
              <button onClick={withdrawForm} className="w-full bg-[#4cff72] text-[#0d0f14] font-bold py-3 rounded-lg hover:bg-[#3de063] transition" disabled={loading}>
                {loading ? 'Processing...' : `Withdraw ${tokens[selectedToken].label}`}
              </button>
            </div>

            <div className="bg-[#151821] border border-[#1e2130] rounded-2xl p-6 col-span-2 flex gap-10 items-center">
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 text-xs uppercase tracking-wider">a{tokens[selectedToken].label} Balance</span>
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
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Refresh Balances'}
              </button>
            </div>
                        <div className="bg-[#151821] border border-[#1e2130] rounded-2xl p-6 col-span-2">
              <h2 className="text-[#4cff72] text-lg font-semibold mb-4">Yield Farm</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Staked Balance</span>
                  <span className="text-gray-200 text-xl font-semibold">{stakedBalance}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Pending Rewards (YRT)</span>
                  <span className="text-gray-200 text-xl font-semibold">{pendingRewards}</span>
                </div>
                <button
                  onClick={fetchYieldFarmBalance}
                  className="border border-[#2a2f45] text-[#4cff72] px-5 py-2 rounded-lg font-semibold text-sm hover:bg-[#1e2130] transition self-center"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Fetch Balances'}
                </button>
              </div>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Amount to stake"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="flex-1 bg-[#1e2130] border border-[#2a2f45] text-gray-200 placeholder-gray-600 px-4 py-3 rounded-lg text-sm outline-none focus:border-[#4cff72]"
                />
                <button onClick={stakeForm} className="bg-[#4cff72] text-[#0d0f14] font-bold px-6 py-3 rounded-lg hover:bg-[#3de063] transition" disabled={loading}>
                  Stake
                </button>
                <button onClick={unstakeForm} className="border border-[#4cff72] text-[#4cff72] font-bold px-6 py-3 rounded-lg hover:bg-[#4cff72] hover:text-[#0d0f14] transition" disabled={loading}>
                  Unstake
                </button>
                <button onClick={claimRewards} className="border border-[#2a2f45] text-[#4cff72] font-bold px-6 py-3 rounded-lg hover:bg-[#1e2130] transition" disabled={loading}>
                  {loading ? 'Processing...' : 'Claim Rewards'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default App