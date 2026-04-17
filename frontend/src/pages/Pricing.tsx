import React from 'react'
import { Activity, ShieldCheck } from 'lucide-react'

interface PricingProps {
  setShowPricing: (v: boolean) => void
  handlePayment: (amount: number, description: string) => void
}

export default function Pricing({ setShowPricing, handlePayment }: PricingProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-white p-12 font-sans overflow-y-auto">
      <button onClick={() => setShowPricing(false)} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 mb-16 transition-all">
        <Activity className="w-4 h-4" /> REVENIR À L'ACCUEIL
      </button>
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-20 space-y-4">
          <h2 className="text-6xl font-black italic tracking-tighter uppercase leading-none">Nos Formules.</h2>
          <p className="text-[#00A3FF] text-[10px] tracking-[0.3em] uppercase font-black">Abonnements ou Paiement à l'acte (Pay-As-You-Go)</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          {/* Essential */}
          <div className="p-12 bg-white/5 border border-white/5 rounded-[50px] flex flex-col hover:border-[#00A3FF]/20 transition-all">
            <span className="text-[10px] font-black uppercase text-[#00A3FF] mb-8">Basique</span>
            <h3 className="text-3xl font-black italic mb-2 tracking-tighter uppercase opacity-80">Essentiel</h3>
            <p className="text-5xl font-black italic tracking-tighter mb-12">7 500 <span className="text-[10px] font-black not-italic opacity-30">FCFA/MOIS</span></p>
            <ul className="flex-1 space-y-5 mb-16 border-t border-white/5 pt-8">
              <li className="flex items-center gap-3 text-[10px] uppercase font-black opacity-40"><ShieldCheck className="w-3 h-3 text-[#00A3FF]" /> Designs Affiches Illimités</li>
              <li className="flex items-center gap-3 text-[10px] uppercase font-black opacity-40"><ShieldCheck className="w-3 h-3 text-[#00A3FF]" /> 3 Vidéos IA (30s) / Mois</li>
              <li className="flex items-center gap-3 text-[10px] uppercase font-black opacity-20 line-through">Brand Kit Intelligence</li>
            </ul>
            <button onClick={() => handlePayment(7500, "Pack Essential")} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all">S'abonner</button>
          </div>
          {/* Pro */}
          <div className="p-12 bg-[#00A3FF] rounded-[60px] flex flex-col relative scale-[1.05] shadow-[0_40px_100px_rgba(0,163,255,0.3)]">
            <div className="absolute top-0 right-0 p-5 bg-black/20 text-white text-[9px] font-black uppercase rounded-bl-3xl">Best-Seller</div>
            <span className="text-[10px] font-black uppercase text-white/60 mb-8">Professionnel</span>
            <h3 className="text-3xl font-black italic mb-2 tracking-tighter uppercase">Agency Kit</h3>
            <p className="text-5xl font-black italic tracking-tighter mb-12">18 500 <span className="text-[10px] font-black not-italic opacity-40">FCFA/MOIS</span></p>
            <ul className="flex-1 space-y-5 mb-16 border-t border-white/20 pt-8">
              <li className="flex items-center gap-3 text-[10px] uppercase font-black"><ShieldCheck className="w-3 h-3" /> 10 Vidéos IA (60s) / Mois</li>
              <li className="flex items-center gap-3 text-[10px] uppercase font-black"><ShieldCheck className="w-3 h-3" /> Brand Kit Scanner AI</li>
              <li className="flex items-center gap-3 text-[10px] uppercase font-black"><ShieldCheck className="w-3 h-3" /> Sous-Titres "Pop" Automatiques</li>
            </ul>
            <button onClick={() => handlePayment(18500, "Pack Agency")} className="w-full py-5 bg-white text-[#00A3FF] rounded-2xl text-[10px] font-black uppercase hover:scale-105 transition-all shadow-2xl shadow-black/20">Activer Pack Agency</button>
          </div>
          {/* Business */}
          <div className="p-12 bg-white/5 border border-white/5 rounded-[50px] flex flex-col hover:border-[#00A3FF]/20 transition-all">
            <span className="text-[10px] font-black uppercase text-[#00A3FF] mb-8">Empire</span>
            <h3 className="text-3xl font-black italic mb-2 tracking-tighter uppercase opacity-80">Full Business</h3>
            <p className="text-5xl font-black italic tracking-tighter mb-12">45 000 <span className="text-[10px] font-black not-italic opacity-30">FCFA/MOIS</span></p>
            <ul className="flex-1 space-y-5 mb-16 border-t border-white/5 pt-8">
              <li className="flex items-center gap-3 text-[10px] uppercase font-black opacity-40"><ShieldCheck className="w-3 h-3 text-[#00A3FF]" /> Vidéos Illimitées</li>
              <li className="flex items-center gap-3 text-[10px] uppercase font-black opacity-40"><ShieldCheck className="w-3 h-3 text-[#00A3FF]" /> Traduction Multi-Langues</li>
              <li className="flex items-center gap-3 text-[10px] uppercase font-black opacity-40"><ShieldCheck className="w-3 h-3 text-[#00A3FF]" /> Liens de Collaboration</li>
            </ul>
            <button onClick={() => handlePayment(45000, "Pack Business")} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all">S'abonner</button>
          </div>
        </div>

        <section className="bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-[60px] p-16 text-center space-y-12">
          <div className="max-w-xl mx-auto space-y-4">
            <h3 className="text-5xl font-black italic tracking-tighter mb-2 uppercase">Pay-As-You-Go.</h3>
            <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase font-bold leading-relaxed">Pas d'abonnement ? Rechargez votre compte et consommez uniquement ce que vous produisez.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-white/5 rounded-[30px] border border-white/5 hover:bg-white/10 transition-all">
              <p className="text-4xl font-black text-[#00A3FF] mb-2 italic">500<span className="text-[10px] opacity-40">FCFA</span></p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Détourage Photo</p>
            </div>
            <div className="p-8 bg-white/5 rounded-[30px] border border-white/5 hover:bg-white/10 transition-all">
              <p className="text-4xl font-black text-[#00A3FF] mb-2 italic">1 000<span className="text-[10px] opacity-40">FCFA</span></p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Design Affiche IA</p>
            </div>
            <div className="p-8 bg-white/5 rounded-[30px] border border-white/5 hover:bg-white/10 transition-all shadow-[0_20px_40px_rgba(0,163,255,0.1)]">
              <p className="text-4xl font-black text-[#00A3FF] mb-2 italic">2 500<span className="text-[10px] opacity-40">FCFA</span></p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Montage Vidéo IA</p>
            </div>
          </div>
          <button onClick={() => handlePayment(5000, "Recharge Crédits (5K)")} className="px-16 py-6 bg-white text-black text-[10px] font-black uppercase rounded-full hover:scale-110 transition-all shadow-2xl">Recharger Crédits</button>
        </section>
      </div>
    </div>
  )
}
