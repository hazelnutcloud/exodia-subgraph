
import {  BondCreated, DepositCall, RedeemCall  } from '../generated/ETHBondV1/ETHBondV1'
import { Deposit, Redemption } from '../generated/schema'
import { loadOrCreateTransaction } from "./utils/Transactions"
import { loadOrCreateOHMie, updateOhmieBalance } from "./utils/OHMie"
import { toDecimal } from "./utils/Decimals"
import { FBEETS_TOKEN } from './utils/Constants'
import { loadOrCreateToken } from './utils/Tokens'
import { createDailyBondRecord } from './utils/DailyBond'
import { getfBeetsUSDRate } from './utils/Price'
import { loadOrCreateProtocolMetric } from './utils/ProtocolMetrics'

export function handleDeposit(call: DepositCall): void {
  let ohmie = loadOrCreateOHMie(call.transaction.from)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)
  let token = loadOrCreateToken(FBEETS_TOKEN)

  let amount = toDecimal(call.inputs._amount, 18)
  let deposit = new Deposit(transaction.id)
  deposit.transaction = transaction.id
  deposit.ohmie = ohmie.id
  deposit.amount = amount
  deposit.value = amount.times(getfBeetsUSDRate())
  deposit.maxPremium = toDecimal(call.inputs._maxPrice)
  deposit.token = token.id;
  deposit.timestamp = transaction.timestamp;
  deposit.save()

  createDailyBondRecord(deposit.timestamp, token, deposit.amount, deposit.value)
  updateOhmieBalance(ohmie, transaction)
}

export function handleRedeem(call: RedeemCall): void {
  let ohmie = loadOrCreateOHMie(call.transaction.from)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)

  let redemption = Redemption.load(transaction.id)
  if (redemption==null){
    redemption = new Redemption(transaction.id)
  }
  redemption.transaction = transaction.id
  redemption.ohmie = ohmie.id
  redemption.token = loadOrCreateToken(FBEETS_TOKEN).id;
  redemption.timestamp = transaction.timestamp;
  redemption.save()
  updateOhmieBalance(ohmie, transaction)
}

export function handleBondCreated(event: BondCreated): void {
  const pm = loadOrCreateProtocolMetric(event.block.timestamp);

  const payout = toDecimal(event.params.payout, 9);

  pm.ohmMinted = pm.ohmMinted.plus(payout);
  pm.save()
}
