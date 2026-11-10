/**
 * Toyol Treasury Policy — accounting and safety, NOT a wallet.
 * There is no money here until real external receipts have been reconciled.
 * No personal funds, deposits or stake; never infer guaranteed profit.
 */
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
export function treasuryView(events=[]){
 const receipts=[],outflows=[],seen=new Set();
 for(const event of Array.isArray(events)?events:[]){
  const value=Number(event?.amount_myr);
  if(!finite(value)||value===0||!event?.reference||seen.has(event.reference))continue;
  if(event.type==='SETTLED_RECEIPT'&&event.owner_recipient_verified===true&&
   event.primary_payment_evidence_verified===true&&event.withdrawable_myr_verified===true){
   receipts.push({...event,amount_myr:value});seen.add(event.reference);
  }else if(event.type==='DISBURSED_EXPENSE'&&event.specific_approval_verified===true&&
   event.payment_receipt_verified===true){outflows.push({...event,amount_myr:value});seen.add(event.reference);}
 }
 const collected=receipts.reduce((n,e)=>n+e.amount_myr,0);
 const spent=outflows.reduce((n,e)=>n+e.amount_myr,0);
 return {collected_myr:+collected.toFixed(2),spent_myr:+spent.toFixed(2),
  available_myr:+Math.max(0,collected-spent).toFixed(2),
  verified_receipts_count:receipts.length,
  real_wallet_connected:false,
  note:'Only reconciled receipts count; this policy module cannot itself custody, move or withdraw funds.'};
}
export function investmentDecision(treasury,opportunity={},decision={}){
 const balance=Number(treasury?.available_myr)||0;
 const cost=Number(opportunity?.cost_myr);
 if(!finite(cost)||cost<=0)return {decision:'NO_SPEND',reason:'No legitimate priced expenditure'};
 if(opportunity?.requests_deposit===true||opportunity?.requires_stake===true||
  opportunity?.upfront_to_unlock_income===true)
  return {decision:'REJECT',reason:'Do not pay to unlock a promised task; deposit or stake can be lost'};
 if(balance===0)return {decision:'REJECT',reason:'No verified Toyol-owned liquid income; owner money forbidden'};
 if(opportunity?.verified_provider_terms!==true||opportunity?.payment_route_authorized!==true)
  return {decision:'VERIFY_FIRST',reason:'Provider legal terms and payment route unverified'};
 if(decision?.independent_downside_review!==true||decision?.specific_payment_authorization!==true)
  return {decision:'APPROVAL_REQUIRED',reason:'Even earned funds require specific controlled authorization for irreversible payment'};
 const max=+(Math.min(balance*.1,5)).toFixed(2);
 if(cost>max)return {decision:'REJECT',reason:'Exceeds limited earned-funds micro-expense cap'};
 if(!finite(opportunity?.minimum_verified_payout_myr)||opportunity.minimum_verified_payout_myr<=cost)
  return {decision:'REJECT',reason:'No demonstrated positive net payout after costs; forecasts cannot guarantee profit'};
 return {decision:'ELIGIBLE_FOR_CONTROLLED_PAYMENT',
  budget_ceiling_myr:max,planned_spend_myr:cost,
  note:'Decision approval is NOT a payment. External payment tool, credential and exact task terms still needed.'};
}
