/**
 * Malaysia-first currency and payout literacy for Toyol.
 * An FX quote is NOT a payout; payment rails do NOT verify a specific gig.
 * Do not infer that TNG accepts international USD/crypto directly.
 */
const CODES=new Set(['MYR','USD','USDC','SGD','EUR','GBP','AUD','JPY','IDR','THB']);
const ROUTES=Object.freeze({
 MALAYSIAN_BANK:{currency:'MYR',rail:'MY_BANK',minimum:null,official:'https://paynet.my/faq/personal-duitnow.html'},
 DUITNOW_TNG:{currency:'MYR',rail:'DUITNOW',minimum:null,official:'https://www.tngdigital.com.my/get-started/transfer/duitnow/'},
 WISE_MYR:{currency:'MYR',rail:'MYR_LOCAL_BANK',minimum:null,official:'https://wise.com/help/articles/2lDYkmGHRiyfl1T8XKuahU/how-do-i-receive-money-with-my-myr-account-details'},
 HACKERONE_MYR_LOCAL:{currency:'MYR',rail:'BANK_LOCAL',minimum:{amount:50,currency:'USD'},official:'https://docs.hackerone.com/en/articles/8395720-payment-preferences'},
 HACKERONE_MYR_SWIFT:{currency:'MYR',rail:'SWIFT',minimum:{amount:100,currency:'USD'},official:'https://docs.hackerone.com/en/articles/8395720-payment-preferences'},
 STRIPE_CONNECTED:{currency:null,rail:'PLATFORM_SPECIFIC',minimum:null,official:'https://support.stripe.com/questions/connect-availability-for-businesses-located-in-malaysia'},
 CRYPTO_WALLET:{currency:'USDC',rail:'CRYPTO',minimum:null,official:null}
});
const rounded=n=>Math.round(n*100)/100;
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function getPayoutRoutes(){return ROUTES;}
export function normalizeCurrency(code){
 const c=String(code||'').trim().toUpperCase();
 return CODES.has(c)?c:null;
}
export function currencyDecision({amount,currency,payoutRoute=null,platformSupportsRoute=false,
 verifiedRecipient=false,settled=false,bankReceiptVerified=false,fxQuote=null,fees=null,paidMyr=null}={}){
 const code=normalizeCurrency(currency);
 if(!code||!finite(amount))throw Error('invalid amount or currency');
 const route=payoutRoute?ROUTES[payoutRoute]:null;
 const transferSupported=!!route&&platformSupportsRoute===true;
 const recipientReady=verifiedRecipient===true;
 const isCrypto=code==='USDC'||route?.rail==='CRYPTO';
 const rate=code==='MYR'?1:
  fxQuote?.from===code&&fxQuote?.to==='MYR'&&finite(fxQuote.rate)&&fxQuote.rate>0&&
  typeof fxQuote.source==='string'&&fxQuote.source.length>5&&
  typeof fxQuote.timestamp==='string'&&Number.isFinite(Date.parse(fxQuote.timestamp))?
  fxQuote.rate:null;
 const feeKnown=fees!==null&&finite(fees?.total_myr)&&fees?.source&&typeof fees.source==='string';
 const converted=rate!==null?rounded(amount*rate):null;
 const netIllustrative=converted!==null&&feeKnown?rounded(converted-fees.total_myr):null;
 const canWithdraw=transferSupported&&recipientReady&&!isCrypto;
 const actuallyReceived=finite(paidMyr)&&settled===true&&bankReceiptVerified===true&&paidMyr>0?rounded(paidMyr):0;
 let status='UNVERIFIED_PAYOUT_PATH';
 if(isCrypto)status='CRYPTO_NOT_MYR';
 else if(canWithdraw)status=rate!==null&&feeKnown?'MYR_ROUTE_AND_QUOTE_PRESENT':'MYR_ROUTE_PRESENT_COST_UNKNOWN';
 else if(transferSupported)status='RECIPIENT_NOT_VERIFIED';
 const hurdle=route?.minimum||null;
 return {
  original:{amount,currency:code},
  currency_kind:isCrypto?'CRYPTO':code==='MYR'?'MALAYSIAN_RINGGIT':'FOREIGN_FIAT',
  route:payoutRoute,platform_supports_route_verified:transferSupported,
  recipient_readiness_verified:recipientReady,
  Malaysian_cashout_route_verified:canWithdraw,
  route_status:status,
  minimum_payout:hurdle,
  minimum_met:hurdle?.currency===code?amount>=hurdle.amount:null,
  fx_quote_verified:rate!==null&&code!=='MYR',
  fx_rate_to_myr:rate,
  illustrative_gross_myr:converted,
  illustrative_net_myr:netIllustrative!==null&&netIllustrative>=0?netIllustrative:null,
  illustrative_only:true,
  actual_received_myr:actuallyReceived,
  earnings_status:actuallyReceived>0?'RECEIPT_VERIFICATION_DECLARED_REQUIRES_BANK_EVIDENCE':'NO_VERIFIED_RECEIPT',
  note:'MYR bank transfer capability is not proof a specific requester will pay. Unknown fees or FX remain null.'
 };
}
export function valuePriority(money,{workEvidence=false,accepted=false,platformProof=false}={}){
 // Not a probability and never pretends unverified cash is guaranteed.
 let p=0;
 if(money.original.currency==='MYR')p+=30;
 else if(money.currency_kind==='FOREIGN_FIAT')p+=12;
 else p-=30;
 if(money.platform_supports_route_verified)p+=25;
 if(money.Malaysian_cashout_route_verified)p+=25;
 if(workEvidence)p+=10;
 if(accepted)p+=10;
 if(platformProof)p+=5;
 if(money.minimum_met===false)p-=25;
 if(money.route_status==='CRYPTO_NOT_MYR')p-=30;
 return {priority_score:Math.max(0,Math.min(100,p)),
  no_probability_inference:true,cash_verified:money.actual_received_myr>0,
  currency_focus:'MYR',recommendation:
   money.Malaysian_cashout_route_verified?'CONSIDER_AFTER_FEASIBILITY':
   'VERIFY_WITH_PAYER_BEFORE_SPENDING_WORK'};
}
