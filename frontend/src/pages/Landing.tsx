import React from 'react'
import { Sparkles, Activity, Image, Palette, FileText, Presentation, Box, Scissors, Video, Zap } from 'lucide-react'

interface LandingProps {
  showAuthModal: boolean
  setShowAuthModal: (v: boolean) => void
  loginEmail: string
  setLoginEmail: (v: string) => void
  loginPassword: string
  setLoginPassword: (v: string) => void
  isRegistering: boolean
  setIsRegistering: (v: boolean) => void
  authError: string | null
  setAuthError: (v: string | null) => void
  handleAuthSubmit: () => void
  loading: boolean
  setShowPricing: (v: boolean) => void
}

function ServiceCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-8 rounded-[30px] hover:bg-white/[0.08] hover:border-[#00A3FF]/30 transition-all group">
      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-all">
        {icon}
      </div>
      <h3 className="text-sm font-black uppercase tracking-widest mb-3">{title}</h3>
      <p className="text-white/40 text-[11px] leading-relaxed tracking-wider font-medium">{desc}</p>
    </div>
  )
}

export default function Landing(props: LandingProps) {
  const { showAuthModal, setShowAuthModal, loginEmail, setLoginEmail, loginPassword, setLoginPassword, isRegistering, setIsRegistering, authError, setAuthError, handleAuthSubmit, loading, setShowPricing } = props

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col overflow-x-hidden font-sans">
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-[#111] border border-white/10 rounded-[40px] p-12 w-full max-w-md shadow-2xl shadow-[#00A3FF]/10 relative">
            <button onClick={() => { setShowAuthModal(false); setAuthError(null) }} className="absolute top-6 right-6 text-white/40 hover:text-white text-xl">✕</button>
            <h2 className="text-3xl font-black italic tracking-tighter mb-2">{isRegistering ? 'Créer un compte' : 'Connexion'}</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] mb-8">{isRegistering ? 'Rejoignez ProDesign' : 'Accédez à votre studio'}</p>
            {authError && <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4 text-red-400 text-xs font-bold">{authError}</div>}
            <div className="space-y-4">
              <input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm font-bold focus:border-[#00A3FF] focus:outline-none transition-all" />
              <input type="password" placeholder="Mot de passe (min. 6 caractères)" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm font-bold focus:border-[#00A3FF] focus:outline-none transition-all" />
              <button onClick={handleAuthSubmit} disabled={loading} className="w-full py-5 bg-[#00A3FF] text-white text-[11px] font-black uppercase rounded-2xl hover:shadow-[0_0_40px_rgba(0,163,255,0.4)] transition-all disabled:opacity-50">
                {loading ? '⏳ Chargement...' : isRegistering ? 'Créer mon compte' : 'Se connecter'}
              </button>
            </div>
            <p className="text-center mt-6 text-white/30 text-xs">
              {isRegistering ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
              <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(null) }} className="text-[#00A3FF] font-bold hover:underline">
                {isRegistering ? 'Se connecter' : "S'inscrire"}
              </button>
            </p>
          </div>
        </div>
      )}

      <nav className="flex items-center justify-between p-8 max-w-7xl mx-auto w-full z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00A3FF] rounded-xl rotate-12 flex items-center justify-center shadow-[0_0_30px_rgba(0,163,255,0.4)]">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black italic tracking-tighter">ProDesign.</span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={() => setShowPricing(true)} className="text-[10px] uppercase font-black opacity-50 hover:opacity-100 tracking-widest transition-all">Tarifs & Pay-Go</button>
          <button onClick={() => setShowAuthModal(true)} className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase rounded-full hover:scale-110 transition-all shadow-xl shadow-white/10">S'inscrire / Connexion</button>
        </div>
      </nav>

      <main className="min-h-[80vh] flex flex-col items-center justify-center text-center p-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00A3FF]/10 blur-[150px] rounded-full -z-10 animate-pulse" />
        <div className="badge border border-[#00A3FF]/30 gap-2 py-4 px-8 text-[10px] font-black uppercase tracking-[0.3em] mb-12 text-[#00A3FF] bg-transparent rounded-full">
          <Activity className="w-3 h-3" /> Adobe-Killer AI Engine v2.0 Africa
        </div>
        <h1 className="text-7xl md:text-9xl font-black italic tracking-[calc(-0.02em)] max-w-6xl mb-12 leading-[0.85] mix-blend-difference">
          LE DESIGN <span className="text-white opacity-20">ALGORITHMIQUE</span> EST ARRIVÉ.
        </h1>
        <p className="text-white/40 max-w-2xl text-xs md:text-sm uppercase tracking-[0.4em] font-medium mb-16 leading-relaxed">
          Gagnez 10x plus de temps sur vos publicités. <br/>
          Génération Vidéo, Voix-Off et Branding en 30 secondes.
        </p>
        <div className="flex flex-col md:flex-row gap-6">
          <button onClick={() => setShowAuthModal(true)} className="px-16 py-6 bg-[#00A3FF] text-white text-xs font-black uppercase rounded-[30px] hover:shadow-[0_0_80px_rgba(0,163,255,0.5)] transition-all hover:-translate-y-2">
            Démarrer le Studio
          </button>
          <button onClick={() => setShowPricing(true)} className="px-16 py-6 bg-white/5 border border-white/10 text-white text-xs font-black uppercase rounded-[30px] hover:bg-white/10 transition-all">
            Plans & Tarifs FCFA
          </button>
        </div>
      </main>

      {/* SECTION SERVICES */}
      <section id="services" className="bg-black py-32 px-8 border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#00A3FF]/5 blur-[100px] -z-10" />
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-24 text-center">
            <h2 className="text-[10px] uppercase font-black text-[#00A3FF] tracking-[0.5em] mb-4">Notre Écosystème</h2>
            <p className="text-4xl md:text-6xl font-black italic tracking-tighter">UNE SOLUTION POUR <span className="text-white opacity-20">CHAQUE BESOIN.</span></p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ServiceCard 
              icon={<Zap className="w-5 h-5 text-[#00A3FF]" />} 
              title="Affiches Publicitaires" 
              desc="Générateur d'affiches haute résolution optimisées pour le marketing africain." 
            />
            <ServiceCard 
              icon={<Palette className="w-5 h-5 text-[#8A2BE2]" />} 
              title="Identité & Logos" 
              desc="Créez des logos vectoriels et des chartes graphiques complètes en un clic." 
            />
            <ServiceCard 
              icon={<Presentation className="w-5 h-5 text-[#00FF85]" />} 
              title="Pitch Decks Pro" 
              desc="Présentations PDF structurées par IA pour vos levées de fonds ou rapports." 
            />
            <ServiceCard 
              icon={<FileText className="w-5 h-5 text-[#FFD700]" />} 
              title="Composition de Docs" 
              desc="Mise en page automatique de documents administratifs et académiques." 
            />
            <ServiceCard 
              icon={<Box className="w-5 h-5 text-[#FF4500]" />} 
              title="Studio Mockup 3D" 
              desc="Visualisez instantanément vos créations sur des supports physiques réels." 
            />
            <ServiceCard 
              icon={<Scissors className="w-5 h-5 text-[#00CED1]" />} 
              title="Détourage IA" 
              desc="Supprimez les arrière-plans de vos photos produits avec une précision chirurgicale." 
            />
            <ServiceCard 
              icon={<Video className="w-5 h-5 text-[#FF1493]" />} 
              title="Publicités Vidéo" 
              desc="Moteur de montage automatisé pour vos Reels, TikTok et publicités TV." 
            />
            <ServiceCard 
              icon={<Sparkles className="w-5 h-5 text-white" />} 
              title="Retouche Photo" 
              desc="Améliorez la qualité de vos images grâce à notre moteur de traitement neuronal." 
            />
          </div>
        </div>
      </section>

      <footer className="p-12 text-[10px] text-white/20 text-center uppercase tracking-[0.5em] font-black">
        Africa Creative Logic &copy; 2026 - Propulsé par Rust Engine
      </footer>
    </div>
  )
}
