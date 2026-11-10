/**
 * Payout routing, not a financial account, off-ramp or transfer engine.
 * Toyol may observe a verified payment held on a provider/wallet.
 * MYR to TNG is an external transfer that only the authorized payout provider can initiate.
 */
const FIAT=new Set(['MYR','USD','SGD','EUR','GBP','AUD']);
const clean=x=>String(x||'').toUpperCase().trim();
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
export function payoutRoute(payment={}){
 const currency=clean(payment.currency);
 const amount=Number(payment.amount);
 const accepted=payment.deliverable_accepted_verified===true;
 const settled=payment.settlement_proof_verified===true;
 const controlled=payment.payout_account_belongs_to_owner===true;
 const held=valid(amount)&&accepted&&settled&&controlled;
 if(!held)return {status:'NOT_OWNED_OR_NOT_SETTLED',owned_amount:0,owned_currency:null,
  can_send_to_tng:false,required_action:'WAIT_FOR_ACCEPTANCE_SETTLEMENT_AND_ACCOUNT_VERIFICATION'};
 const common={owned_amount:amount,owned_currency:currency,can_send_to_tng:false,received_by_tng_verified:false};
 if(currency==='MYR'){
  if(payment.provider_supports_tng_duitnow_verified===true&&payment.owner_tng_receiving_verified===true){
   return {...common,status:'MYR_READY_FOR_TNG_TRANSFER',
    required_action:'AUTHORIZE_PAYMENT_IN_OFFICIAL_PROVIDER; VERIFY_TNG_RECEIPT'};
  }
  return {...common,status:'MYR_CUSTODIED_EXTERNALLY',
   required_action:'VERIFY_PROVIDER_DUITNOW_TNG_SUPPORT_AND_OWNER_RECEIVING_ACCOUNT'};
 }
 if(currency==='USDC'||currency==='OUSD'){
  return {...common,status:'CRYPTO_HELD_OUTSIDE_TNG',
   required_action:'VERIFY_LEGAL_OFFRAMP_IN_MALAYSIA_AND_ASSET_NETWORK_SUPPORT; NEVER_SEND_CRYPTO_TO_TNG_DIRECTLY',
   custodian:payment.custodian||'EXTERNAL_WALLET'};
 }
 if(FIAT.has(currency)){
  return {...common,status:'FOREIGN_FIAT_HELD_EXTERNALLY',
   required_action:'VERIFY_PAYOUT_PROVIDER_CAN_CONVERT_AND_SEND_MYR_TO_OWNER_TNG_DUITNOW'};
 }
 return {...common,status:'UNSUPPORTED_CURRENCY_HELD_EXTERNALLY',
  required_action:'CHECK_CURRENCY_OWNERSHIP_LEGALITY_AND_WITHDRAWAL_SUPPORT'};
}
export function tngReceiptStatus(receipt={}){
 const amount=Number(receipt.amount_myr);
 if(valid(amount)&&receipt.provider_transfer_settled_verified===true&&
   receipt.owner_tng_credit_verified===true&&receipt.independent_evidence_verified===true)
  return {status:'CONFIRMED_TNG_CREDIT',amount_myr:amount};
 return {status:'TNG_CREDIT_NOT_CONFIRMED',amount_myr:0};
}
