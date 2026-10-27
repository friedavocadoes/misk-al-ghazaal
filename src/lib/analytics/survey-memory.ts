import type { SurveyHistory } from "./survey-policy";
export const SURVEY_HISTORY_KEY="misk-survey-history";
export function feedbackHistory():SurveyHistory {
 let history:SurveyHistory={};
 try{const value=JSON.parse(localStorage.getItem(SURVEY_HISTORY_KEY)??"{}");if(value&&typeof value==="object"&&!Array.isArray(value))history=value;}catch{}
 try{const cookie=document.cookie.split("; ").find(v=>v.startsWith("misk-feedback-purchase="));const stamp=Number(cookie?.split("=")[1]);if(Number.isFinite(stamp)&&stamp>0)history.purchasedAt=Math.max(history.purchasedAt??0,stamp);}catch{}
 return history;
}
export function rememberFeedback(patch:SurveyHistory){try{localStorage.setItem(SURVEY_HISTORY_KEY,JSON.stringify({...feedbackHistory(),...patch}));}catch{}}
export function rememberPurchase(){
 const now=Date.now();rememberFeedback({purchasedAt:now});
 try{document.cookie=`misk-feedback-purchase=${now}; Path=/; Max-Age=604800; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`;}catch{}
}
