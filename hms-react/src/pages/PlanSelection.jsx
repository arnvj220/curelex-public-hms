// src/pages/PlanSelection.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const C = {
  brand:'#0a3d62', brandMid:'#1565a8', accent:'#00b894', accentLight:'#00cec9',
  textDark:'#0a3d62', textMuted:'#4a6278', textLight:'#8fa8bc',
  border:'#d0dce8', white:'#ffffff',
};

const PLANS = [
  {
    key:'lite', name:'Clinic Lite', tagline:'Perfect for single doctor clinics', price:999,
    icon:'🏥', badge:null, bestFor:'Small Clinics, Solo Practitioners, Daily OPD Management',
    color:'#1a7a4a', colorLight:'rgba(26,122,74,0.08)', gradFrom:'#1a7a4a', gradTo:'#27ae60', shadow:'rgba(26,122,74,0.28)',
    features:['Up to 3 Doctors','2 Receptionist Logins','Queue Management','Token System','Patient Registration','Basic Patient Records','OPD History','Fast Patient Search','Basic Dashboard'],
  },
  {
    key:'plus', name:'Clinic Plus', tagline:'For growing clinics with more doctors & billing needs', price:1499,
    icon:'🏢', badge:'Most Popular', bestFor:'Medium Clinics, Multi-Doctor Clinics, Clinics with In-House Pharmacy',
    color:'#1565a8', colorLight:'rgba(21,101,168,0.08)', gradFrom:'#0a3d62', gradTo:'#1565a8', shadow:'rgba(10,61,98,0.28)',
    extraLabel:'ALL CLINIC LITE FEATURES +',
    features:['Multi Doctor & Multi User Access','Unlimited Reception Logins','Pharmacy Inventory Management','Billing & Invoice Generation','Medicine Stock Alerts','Prescription Records','Daily Revenue Reports','Staff Login Management','PDF Report Upload Support'],
  },
  {
    key:'pro', name:'Clinic Pro', tagline:'Complete smart clinic ecosystem with advanced automation', price:1999,
    icon:'⭐', badge:'Most Advanced', bestFor:'Advanced Clinics, High Patient Flow Centers, Smart Digital Clinics',
    color:'#6c3fc5', colorLight:'rgba(108,63,197,0.08)', gradFrom:'#6c3fc5', gradTo:'#8e5cf5', shadow:'rgba(108,63,197,0.30)',
    extraLabel:'ALL CLINIC PLUS FEATURES +',
    features:['Multi Doctor & Multi User Access','Unlimited Reception Logins','Follow-Up Reminder System','Advanced EMR','Role Based Access Control','Lab Report Management','Analytics Dashboard','Priority Patient Management','Advanced Billing & Reports','Doctor Performance Insights'],
  },
];

export default function PlanSelection({ onDone }) {
  const { user, updateUserData } = useAuth();
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState('plans');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const plan = PLANS.find(p => p.key === selected);

  function choosePlan(key) { 
    setSelected(key); 
    setStep('confirm');
    setError(null);
  }

  async function handlePay() {
    setStep('paying');
    setLoading(true);
    setError(null);
    
    try {
      console.log('📡 Activating plan:', selected);
      console.log('📡 User:', user);
      
      // Call the correct API endpoint
      const response = await API.post('/clinics/activate-plan', {
        plan: selected
      });

      console.log('✅ Response:', response.data);

      if (response.data) {
        // Update user data with new plan
        if (updateUserData) {
          updateUserData({ 
            activePlan: selected,
            planActivatedAt: new Date().toISOString().split('T')[0],
            planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });
        }
        setStep('success');
      } else {
        throw new Error('Activation failed: No data returned');
      }
    } catch (e) {
      console.error('❌ Activation error:', e);
      setError(e.response?.data?.message || e.message || 'Activation failed');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(150deg,#e8f4fd 0%,#f0f8ff 40%,#e8f9f5 100%)',
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      padding:'32px 16px 48px',
      fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes popIn{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.14)}100%{transform:scale(1);opacity:1}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,184,148,0.45)}50%{box-shadow:0 0 0 10px rgba(0,184,148,0)}}
        .plan-card{transition:transform 0.22s,box-shadow 0.22s!important}
        .plan-card:hover{transform:translateY(-6px)!important;box-shadow:0 24px 60px rgba(10,61,98,0.18)!important}
        .pay-btn:hover{opacity:0.88!important}
        .feature-row{display:flex;align-items:flex-start;gap:9px;font-size:13.5px;margin-bottom:7px}
      `}</style>

      {/* ══ PLANS ══ */}
      {step === 'plans' && (
        <div style={{width:'100%',maxWidth:1080,animation:'fadeUp 0.45s ease'}}>
          {/* Brand */}
          <div style={{textAlign:'center',marginBottom:8}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:4}}>
              <div style={{width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#0a3d62,#1565a8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>➕</div>
              <span style={{fontFamily:'Georgia,serif',fontWeight:700,fontSize:22,color:C.brand,letterSpacing:1}}>CURELEX</span>
            </div>
            <div style={{fontSize:12,color:C.textMuted,letterSpacing:1}}>Smart Clinic. Stronger Care.</div>
          </div>

          {/* Heading */}
          <div style={{textAlign:'center',marginBottom:36,marginTop:20}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(0,184,148,0.10)',border:'1px solid rgba(0,184,148,0.25)',borderRadius:20,padding:'4px 14px',fontSize:12.5,color:'#00a878',fontWeight:600,marginBottom:14}}>🎉 Choose a Plan</div>
            <div style={{fontFamily:'Georgia,serif',fontSize:32,fontWeight:700,color:C.textDark,marginBottom:10,lineHeight:1.2}}>Choose the Plan That Grows With Your Clinic</div>
            <div style={{color:C.textMuted,fontSize:14.5,maxWidth:520,margin:'0 auto',lineHeight:1.65}}>Select a plan to activate your clinic dashboard and start managing patients.</div>
          </div>

          {/* Plan cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:22}}>
            {PLANS.map(p => (
              <div key={p.key} className="plan-card" style={{position:'relative',background:C.white,borderRadius:22,padding:'0 0 26px',border:`2px solid ${p.color}40`,boxShadow:`0 8px 32px ${p.colorLight}`,overflow:'hidden'}}>
                <div style={{background:`linear-gradient(135deg,${p.gradFrom},${p.gradTo})`,padding:'22px 24px 18px',marginBottom:20,position:'relative'}}>
                  {p.badge && <div style={{position:'absolute',top:14,right:14,background:'rgba(255,255,255,0.22)',color:'#fff',fontSize:10.5,fontWeight:700,padding:'3px 10px',borderRadius:20,border:'1px solid rgba(255,255,255,0.3)'}}>{p.badge}</div>}
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                    <div style={{width:48,height:48,borderRadius:12,background:'rgba(255,255,255,0.18)',border:'1.5px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>{p.icon}</div>
                    <div>
                      <div style={{color:'#fff',fontWeight:800,fontSize:20,fontFamily:'Georgia,serif'}}>{p.name}</div>
                      <div style={{color:'rgba(255,255,255,0.75)',fontSize:12,lineHeight:1.4,maxWidth:200}}>{p.tagline}</div>
                    </div>
                  </div>
                  <div style={{marginTop:10}}>
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.8)',fontWeight:500}}>₹</span>
                    <span style={{fontSize:40,fontWeight:800,color:'#fff',lineHeight:1}}>{p.price.toLocaleString()}</span>
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.75)'}}> /month + Platform Fee</span>
                  </div>
                </div>
                <div style={{padding:'0 22px',marginBottom:20}}>
                  {p.extraLabel && <div style={{fontSize:10.5,fontWeight:700,color:p.color,textTransform:'uppercase',letterSpacing:0.7,marginBottom:10,background:p.colorLight,borderRadius:6,padding:'4px 8px',display:'inline-block'}}>{p.extraLabel}</div>}
                  {p.features.map((feat,i) => (
                    <div key={i} className="feature-row">
                      <span style={{width:18,height:18,borderRadius:'50%',flexShrink:0,marginTop:1,background:`linear-gradient(135deg,${p.gradFrom},${p.gradTo})`,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}}>✓</span>
                      <span style={{color:C.textDark,lineHeight:1.4}}>{feat}</span>
                    </div>
                  ))}
                </div>
                <div style={{margin:'0 22px 18px',background:p.colorLight,borderRadius:10,padding:'10px 14px',border:`1px solid ${p.color}20`}}>
                  <div style={{fontSize:10.5,fontWeight:700,color:p.color,textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>⭐ Best For</div>
                  <div style={{fontSize:12.5,color:C.textDark,lineHeight:1.5}}>{p.bestFor}</div>
                </div>
                <div style={{padding:'0 22px'}}>
                  <button onClick={() => choosePlan(p.key)} className="pay-btn"
                    style={{width:'100%',padding:'13px 20px',borderRadius:11,border:'none',background:`linear-gradient(135deg,${p.gradFrom},${p.gradTo})`,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:`0 5px 18px ${p.shadow}`,transition:'opacity 0.18s'}}>
                    Choose {p.name} →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Why Curelex */}
          <div style={{marginTop:40,textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:1,marginBottom:18}}>WHY CLINICS CHOOSE CURELEX?</div>
            <div style={{display:'flex',justifyContent:'center',gap:24,flexWrap:'wrap',marginBottom:20}}>
              {[{icon:'⚡',label:'Fast Queue Handling'},{icon:'📱',label:'Hybrid QR Based Booking'},{icon:'👤',label:'Easy Patient Record Access'},{icon:'₹',label:'Low Cost Digital Setup'},{icon:'📈',label:'Scalable from Small to Full HMS'},{icon:'🔒',label:'Secure & Cloud Based'}].map(({icon,label}) => (
                <div key={label} style={{textAlign:'center',minWidth:90}}>
                  <div style={{width:44,height:44,borderRadius:12,background:'#fff',border:'1.5px solid #dce9f5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,margin:'0 auto 6px',boxShadow:'0 2px 8px rgba(10,61,98,0.06)'}}>{icon}</div>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:500,lineHeight:1.3,maxWidth:80}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:12.5,color:C.textLight}}>🔒 No hidden fees · Cancel anytime · Plans renew monthly</div>
          </div>

          {/* Demo CTA */}
          <div style={{marginTop:28,background:'linear-gradient(135deg,#0a3d62,#1565a8)',borderRadius:18,padding:'22px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
            <div>
              <div style={{color:'#fff',fontWeight:700,fontSize:17,fontFamily:'Georgia,serif'}}>📞 Book a Free Demo Today!</div>
              <div style={{color:'rgba(255,255,255,0.75)',fontSize:13,marginTop:4}}>Experience the Future of Clinic Management</div>
              <div style={{display:'flex',gap:16,marginTop:8,flexWrap:'wrap'}}>
                {['✅ Easy to Use','✅ Secure','✅ Reliable','✅ Made for Clinics'].map(t => <span key={t} style={{fontSize:11.5,color:'rgba(255,255,255,0.8)'}}>{t}</span>)}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{color:'#fff',fontWeight:700,fontSize:15}}>+91 74118 93735</div>
              <div style={{color:'rgba(255,255,255,0.75)',fontSize:12,marginTop:3}}>www.curelex.in</div>
              <div style={{color:'rgba(255,255,255,0.75)',fontSize:12}}>hello@curelex.in</div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIRM ══ */}
      {step === 'confirm' && plan && (
        <div style={{width:'100%',maxWidth:440,animation:'fadeUp 0.4s ease'}}>
          <button onClick={() => setStep('plans')} style={{background:'none',border:'none',cursor:'pointer',color:C.textMuted,fontSize:13.5,display:'flex',alignItems:'center',gap:6,marginBottom:18,padding:0,fontFamily:'inherit'}}>← Back to Plans</button>
          <div style={{background:C.white,borderRadius:22,padding:'32px 30px',boxShadow:'0 20px 60px rgba(10,61,98,0.13)',border:'1px solid rgba(10,61,98,0.07)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${plan.gradFrom},${plan.gradTo})`}}/>
            <div style={{fontFamily:'Georgia,serif',fontSize:22,fontWeight:700,color:C.textDark,marginBottom:22}}>Order Summary</div>
            
            {error && (
              <div style={{background:'#fee2e2',color:'#991b1b',padding:'12px 16px',borderRadius:8,marginBottom:16,fontSize:13}}>
                ⚠️ {error}
              </div>
            )}
            
            <div style={{background:plan.colorLight,border:`1.5px solid ${plan.color}30`,borderRadius:14,padding:'18px 20px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700,fontSize:17,color:C.textDark}}>{plan.icon} {plan.name}</div>
                <div style={{fontSize:13,color:C.textMuted,marginTop:3}}>Monthly · Renews in 30 days</div>
              </div>
              <div style={{fontWeight:800,fontSize:22,color:plan.color}}>₹{plan.price.toLocaleString()}</div>
            </div>
            <div style={{marginBottom:22}}>
              <div style={{fontSize:11.5,fontWeight:600,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12}}>What's Included</div>
              {plan.features.slice(0,6).map((feat,i) => (
                <div key={i} className="feature-row">
                  <span style={{width:18,height:18,borderRadius:'50%',background:`linear-gradient(135deg,${plan.gradFrom},${plan.gradTo})`,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0,fontWeight:700,marginTop:1}}>✓</span>
                  <span style={{color:C.textDark,fontSize:13.5}}>{feat}</span>
                </div>
              ))}
              {plan.features.length > 6 && <div style={{fontSize:12.5,color:C.textMuted,marginTop:6,paddingLeft:27}}>+ {plan.features.length-6} more features</div>}
            </div>
            <div style={{borderTop:`1px dashed ${C.border}`,margin:'18px 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontWeight:600,fontSize:15,color:C.textDark}}>Subscription</span>
              <span style={{fontWeight:700,fontSize:16,color:C.textDark}}>₹{plan.price.toLocaleString()}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <span style={{fontSize:13,color:C.textMuted}}>Platform Fee</span>
              <span style={{fontSize:13,color:C.textMuted}}>As applicable</span>
            </div>
            <button onClick={handlePay} disabled={loading} className="pay-btn"
              style={{width:'100%',padding:'16px 20px',borderRadius:11,border:'none',background:loading ? '#94a3b8' : `linear-gradient(135deg,${C.accent},${C.accentLight})`,color:'#fff',fontSize:16,fontWeight:700,cursor:loading ? 'not-allowed' : 'pointer',boxShadow:'0 5px 20px rgba(0,184,148,0.35)',display:'flex',alignItems:'center',justifyContent:'center',gap:10,transition:'opacity 0.18s'}}>
              {loading ? 'Processing...' : '🚀 Pay Now & Activate Plan'}
            </button>
            <div style={{textAlign:'center',marginTop:12,fontSize:12,color:C.textLight}}>Instant activation · Secure payment</div>
          </div>
        </div>
      )}

      {/* ══ PAYING ══ */}
      {step === 'paying' && (
        <div style={{textAlign:'center',animation:'fadeUp 0.3s ease'}}>
          <div style={{width:74,height:74,border:'5px solid rgba(0,184,148,0.18)',borderTopColor:C.accent,borderRadius:'50%',animation:'spin 0.85s linear infinite',margin:'0 auto 24px'}}/>
          <div style={{fontFamily:'Georgia,serif',fontSize:23,fontWeight:700,color:C.textDark,marginBottom:8}}>Activating Your Plan…</div>
          <div style={{color:C.textMuted,fontSize:14}}>Just a moment.</div>
        </div>
      )}

      {/* ══ SUCCESS ══ */}
      {step === 'success' && plan && (
        <div style={{width:'100%',maxWidth:420,textAlign:'center',animation:'fadeUp 0.45s ease'}}>
          <div style={{background:C.white,borderRadius:24,padding:'46px 32px 36px',boxShadow:'0 24px 72px rgba(10,61,98,0.15)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${plan.gradFrom},${plan.gradTo})`}}/>
            <div style={{fontSize:70,marginBottom:16,display:'block',animation:'popIn 0.55s ease both'}}>🎉</div>
            <div style={{fontFamily:'Georgia,serif',fontSize:28,fontWeight:700,color:C.textDark,marginBottom:8}}>Plan Activated!</div>
            <div style={{color:C.textMuted,fontSize:14.5,lineHeight:1.7,marginBottom:26}}>Your <strong>{plan.name}</strong> is now live.<br/>You have full access to the clinic dashboard.</div>
            <div style={{background:plan.colorLight,border:`1.5px solid ${plan.color}25`,borderRadius:14,padding:'14px 20px',marginBottom:28,textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:plan.color}}>{plan.icon} {plan.name}</div>
                <div style={{fontSize:12.5,color:C.textMuted,marginTop:3}}>₹{plan.price.toLocaleString()} / month · Renews in 30 days</div>
              </div>
              <span style={{background:'rgba(0,184,148,0.12)',color:'#00a878',borderRadius:20,padding:'3px 11px',fontSize:11.5,fontWeight:700}}>● Active</span>
            </div>
            <button onClick={onDone} className="pay-btn"
              style={{width:'100%',padding:'14px 20px',borderRadius:11,border:'none',background:'linear-gradient(135deg,#0a3d62,#1565a8)',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:'0 5px 18px rgba(10,61,98,0.28)',transition:'opacity 0.18s'}}>
              Go to Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}