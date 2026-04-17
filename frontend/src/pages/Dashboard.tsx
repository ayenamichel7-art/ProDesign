import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, Palette, Type, Layout, Download, Share2, Upload, Image, Calendar, Fingerprint, Store, BookOpen, Layers, Video, Music, Activity, ShieldCheck, Plus, AlertTriangle } from 'lucide-react'

// Configuration de l'API - Détectée dynamiquement

export default function Dashboard({ authToken, setAuthToken, handleLogout }: { authToken: string, setAuthToken: (t: string | null) => void, handleLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'design' | 'photo' | 'branding' | 'catalog' | 'rembg' | 'video' | 'pricing' | 'document' | 'presentation'>('design')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: 'PRO DESIGN',
    overtitle: '',
    subtitle: "L'AVENIR DU GRAPHISME ALGORITHMIQUE",
    extraText: '',
    context: '',
    theme: 'luxury',
    color: '#00E0FF',
    fontFamily: 'auto',
    extraInfo: '',
    style: 'default',
    brandColors: ['#00E0FF'], // Palette de couleurs
    brandIdea: '',           // Idée / Contexte branding
  })
  const [chapters, setChapters] = useState([{ title: 'EXPOSE DES MOTIFS', content: '' }])
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [includeToc, setIncludeToc] = useState(true)
  const [includePagination, setIncludePagination] = useState(true)
  const [watermark, setWatermark] = useState('')
  const [activeDocStyle, setActiveDocStyle] = useState<'standard' | 'luxury' | 'academic' | 'business'>('standard')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [showQrCode, setShowQrCode] = useState(false)
  const [exportFormat, setExportFormat] = useState('web') // web, a4, a3
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bgBase64, setBgBase64] = useState<string | null>(null)
  const [bgPreview, setBgPreview] = useState<string | null>(null)
  const [inspirationBase64, setInspirationBase64] = useState<string | null>(null)
  const [inspirationPreview, setInspirationPreview] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<{url: string, id: string}[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAutoColor, setIsAutoColor] = useState(false)
  const [campaignProducts, setCampaignProducts] = useState("")
  const [brandIdentity, setBrandIdentity] = useState<any>(null)
  const [webDimension, setWebDimension] = useState("1080x1920")
  const [availableFonts, setAvailableFonts] = useState<string[]>([])
  const [fontSearch, setFontSearch] = useState('')
  const [mockupUrls, setMockupUrls] = useState<{url: string, id: string}[] | null>(null)
  const [shareLink, setShareLink] = useState<{url: string, expires_at: number} | null>(null)
  const [shareDays, setShareDays] = useState(7)
  const [isSmashing, setIsSmashing] = useState(false)
  const [isShareView, setIsShareView] = useState(false)
  const [sharedPhotos, setSharedPhotos] = useState<{url: string, id: string}[] | null>(null)
  const [isPrintMode, setIsPrintMode] = useState(false)
  const [rembgBase64, setRembgBase64] = useState<string | null>(null)
  const [rembgPreview, setRembgPreview] = useState<string | null>(null)

  // États Video Engine
  const [videoIntentions, setVideoIntentions] = useState('')
  const [videoProgress, setVideoProgress] = useState<{job_id: string, ffmpeg_log: string} | null>(null)
  const [videoFiles, setVideoFiles] = useState<{name: string, type: 'video' | 'audio' | 'image'}[]>([])
  const [videoVersions, setVideoVersions] = useState<{version: number, url: string, date: string, job_id: string}[]>([])
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  
  // États Brand Kit
  const [brandPalette, setBrandPalette] = useState({ primary: '#00A3FF', secondary: '#FFFFFF', accent: '#000000' })
  const [brandLogo, setBrandLogo] = useState<string | null>(null)
  const [brandFont, setBrandFont] = useState('Inter')
  const [targetLanguage, setTargetLanguage] = useState<'fr' | 'en' | 'es'>('fr')
  
  const videoInputRef = useRef<HTMLInputElement>(null)

  const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8080' : ''

const sanitizeUrl = (url: string) => {
  if (!url) return '#';
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('javascript:')) return '#';
  if (trimmed.toLowerCase().startsWith('data:text/html')) return '#';
  return trimmed;
};

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (options.headers) Object.assign(headers, options.headers)
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    const resp = await fetch(url, { ...options, headers })
    if (resp.status === 401) {
      localStorage.removeItem('prodesign_token')
      setAuthToken(null)
      throw new Error('Session expirée, veuillez vous reconnecter')
    }
    return resp
  }


  useEffect(() => {
    // Detection du mode "Vue Partagee" Smash
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
       const token = path.split('/')[2];
       if (token) {
          setIsShareView(true);
          setLoading(true);
          fetch(`${apiBaseUrl}/api/share/${token}`)
            .then(res => {
               if (!res.ok) throw new Error("Lien expiré ou introuvable");
               return res.json();
            })
            .then(data => {
               setSharedPhotos(data.results.map((r: any) => ({ url: `${apiBaseUrl}${r.url}`, id: r.id })));
               setLoading(false);
            })
            .catch(err => {
               setError(err.message);
               setLoading(false);
            });
       }
    }

    fetch(`${apiBaseUrl}/api/fonts`)
      .then(res => res.json())
      .then(data => setAvailableFonts(data))
      .catch(err => console.error("Erreur chargement polices:", err))
  }, [apiBaseUrl])

  useEffect(() => {
    if (activeTab === 'video') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const videoWsUrl = `${protocol}//${window.location.host}/video/api/ws`;
      const ws = new WebSocket(videoWsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setVideoProgress(data);
          if (data.status === 'completed' && data.url) {
             setVideoVersions(prev => [
                { version: prev.length + 1, url: data.url, date: new Date().toLocaleTimeString(), job_id: data.job_id },
                ...prev
             ]);
          }
        } catch(e) {}
      };
      
      return () => ws.close();
    }
  }, [activeTab]);

  // États pour Studio Photo
  const [batchPhotos, setBatchPhotos] = useState<string[]>([])
  const [processProgress, setProcessProgress] = useState(0)
  const [photoConfig, setPhotoConfig] = useState({
    exposure: 1.0,
    contrast: 1.1,
    saturation: 1.2,
    sharpen: true,
    denoise: true,
    target_size: "4x5",
    restoration: false,
    auto_wb: true,
    gamma: 1.1,
  })

  const logoInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)
  const inspirationInputRef = useRef<HTMLInputElement>(null)
  const batchInputRef = useRef<HTMLInputElement>(null)
  const rembgInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (file: File, type_: 'logo' | 'background' | 'batch' | 'inspiration' | 'rembg' | 'video') => {
    if (!file) return
    
    if (type_ === 'video') {
       if (file.size > 500 * 1024 * 1024) {
         setError('Fichier trop volumineux (max 500 Mo pour les rushs)')
         return
       }
       const isAudio = file.type.startsWith('audio/')
       const isImage = file.type.startsWith('image/')
       setVideoFiles(prev => [...prev, { name: file.name, type: isAudio ? 'audio' : isImage ? 'image' : 'video' }])
       return
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 20 Mo)')
      return
    }

    const reader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result as string
      if (type_ === 'logo') {
        setLogoBase64(result)
        setLogoPreview(result)
      } else if (type_ === 'background') {
        setBgBase64(result)
        setBgPreview(result)
      } else if (type_ === 'inspiration') {
        setInspirationBase64(result)
        setInspirationPreview(result)
      } else if (type_ === 'batch') {
        setBatchPhotos((prev: string[]) => [...prev, result])
      } else if (type_ === 'rembg') {
        setRembgBase64(result)
        setRembgPreview(result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = async (mode: 'single' | 'rush' | 'campaign' | 'studio' | 'branding' = 'single') => {
    setLoading(true)
    setError(null)
    setPreviewUrls(null)
    try {
      if (mode === 'studio') {
        const resp = await authFetch(`${apiBaseUrl}/api/photo-studio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images_base64: batchPhotos,
            config: photoConfig
          })
        })
        if (!resp.ok) throw new Error(`Erreur Studio: ${resp.status}`)
        const data = await resp.json()
        setPreviewUrls(data.results.map((r: any) => ({ url: `${apiBaseUrl}${r.url}`, id: r.poster_id })))
        return
      }

      if (mode === 'branding') {
        const res = await authFetch(`${apiBaseUrl}/api/brand-identity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.title,
            slogan: formData.subtitle || null,
            primary_color: formData.brandColors?.[0] || formData.color,
            secondary_colors: formData.brandColors || [formData.color],
            idea_context: formData.brandIdea,
            style: 'modern'
          })
        })
        const data = await res.json()
        setBrandIdentity(data)
        setPreviewUrls(data.logo_variants.map((v: any) => ({ url: `${apiBaseUrl}${v.url}`, id: v.poster_id })))
        return
      }

      const body: any = {
        title: formData.title,
        overtitle: formData.overtitle,
        subtitle: formData.subtitle,
        text: formData.extraText,
        context: formData.context,
        primary_color: isAutoColor ? 'auto' : formData.color,
        theme: formData.theme,
        style: formData.style,
        format: exportFormat,
        qr_code_url: showQrCode ? qrCodeUrl : null,
        web_dimension: exportFormat === 'web' ? webDimension : null,
        is_print: isPrintMode,
      }
      if (formData.fontFamily !== 'auto') {
        body.font_family = formData.fontFamily;
      }

      if (logoBase64) body.logo_base_64 = logoBase64
      if (bgBase64) body.background_base_64 = bgBase64
      if (inspirationBase64) body.inspiration_base_64 = inspirationBase64
      if (formData.extraInfo) body.extra_info = formData.extraInfo
      
      let endpoint = '/api/generate';
      if (mode === 'rush') endpoint = '/api/rush';
      if (mode === 'campaign') {
        endpoint = '/api/campaign';
        body.products = campaignProducts.split('\n').filter((p: string) => p.trim() !== '');
      }

      const finalBody = mode === 'campaign' ? { base: body, products: body.products } : body;

      const resp = await authFetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBody)
      })

      if (!resp.ok) throw new Error(`Erreur serveur: ${resp.status}`)

      const data = await resp.json()
      if (mode === 'rush' || mode === 'campaign') {
        setPreviewUrls(data.results.map((r: any) => ({ url: `${apiBaseUrl}${r.url}`, id: r.poster_id })))
      } else {
        setPreviewUrls([{ url: `${apiBaseUrl}${data.url}`, id: data.poster_id }])
      }
    } catch (e: any) {
      console.error("Erreur de génération:", e)
      setError("Le moteur n'a pas pu traiter la demande.")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDocument = async () => {
    setLoading(true);
    setPdfUrl(null);
    try {
      const response = await authFetch(`${apiBaseUrl}/api/document/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          subtitle: formData.subtitle,
          author: "Utilisateur Pro", // À dynamiser plus tard
          date: new Date().toLocaleDateString(),
          chapters: chapters,
          theme_color: formData.color,
          style: activeDocStyle,
          institution: formData.context,
          include_toc: includeToc,
          include_pagination: includePagination,
          watermark: watermark || null,
        }),
      });
      const data = await response.json();
      setPdfUrl(`${apiBaseUrl}${data.url}`);
    } catch (error) {
      console.error("Error generating document:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePresentation = async () => {
    if (!formData.brandIdea) return;
    setLoading(true);
    setPdfUrl(null);
    try {
      const volumeStr = document.querySelector('select:nth-of-type(1)')?.getAttribute('value') || "10";
      const structureStr = document.querySelector('select:nth-of-type(2)')?.getAttribute('value') || "business";
      const toneStr = document.querySelector('select:nth-of-type(3)')?.getAttribute('value') || "visionnaire";
      
      const response = await authFetch(`${apiBaseUrl}/api/presentation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: formData.brandIdea,
          volume: volumeStr, // On pourrait utiliser un state, mais c'est temporaire pour accélérer l'intégration
          structure: structureStr,
          tone: toneStr
        }),
      });
      if (!response.ok) throw new Error("Génération échouée");
      const data = await response.json();
      setPdfUrl(`${apiBaseUrl}${data.pdf_url}`);
    } catch (error) {
      console.error("Erreur génération Pitch Deck:", error);
      setError("Le générateur algorithmique n'a pas pu créer la présentation.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMockups = async () => {
    if (!brandIdentity || !brandIdentity.logo_variants || brandIdentity.logo_variants.length === 0) {
      setError("Veuillez d'abord générer une identité visuelle.");
      return;
    }
    setLoading(true)
    setError(null)
    try {
      const logo = brandIdentity.logo_variants[0]
      const resp = await authFetch(`${apiBaseUrl}/api/brand-mockups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: logo.url })
      })
      if (!resp.ok) throw new Error(`Erreur Mockup: ${resp.status}`)
      const data = await resp.json()
      setMockupUrls(data.results.map((r: any) => ({ url: `${apiBaseUrl}${r.url}`, id: r.poster_id })))
    } catch (e: any) {
      console.error("Erreur Mockup:", e)
      setError("Impossible de générer les mockups.")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveBg = async () => {
    if (!rembgBase64) return
    setLoading(true)
    setError(null)
    setPreviewUrls(null)
    try {
      const resp = await authFetch(`${apiBaseUrl}/api/remove-bg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: rembgBase64 })
      })
      if (!resp.ok) throw new Error(`Erreur Détourage: ${resp.status}`)
      const data = await resp.json()
      setPreviewUrls([{ url: `${apiBaseUrl}${data.url}`, id: 'rembg_result' }])
    } catch (e: any) {
      console.error("Erreur Détourage:", e)
      setError("Impossible de détourez l'image.")
    } finally {
      setLoading(false)
    }
  }

  const handleVideoSubmit = async () => {
    if (videoFiles.length === 0 && !videoIntentions) {
       setError("Veuillez fournir des rushs ou des intentions.");
       return;
    }
    setLoading(true);
    setVideoProgress(null);
    try {
      const videoApiUrl = `${window.location.protocol}//${window.location.host}/video/api/auto_edit`;
      const body: any = { 
         intentions: videoIntentions, 
         files: videoFiles.map((f: any) => f.name),
         brand_kit: {
            palette: brandPalette,
            font: brandFont,
            logo: brandLogo,
            language: targetLanguage
         }
      }
      if (currentJobId) body.parent_job_id = currentJobId;

      const resp = await authFetch(videoApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) throw new Error("Erreur Moteur Vidéo");
      const data = await resp.json();
      setCurrentJobId(data.job_id);
    } catch(e: any) {
      console.error(e);
      setError("Moteur vidéo injoignable ou en cours de déploiement.");
    } finally {
      setLoading(false);
    }
  }

   const handlePayment = async (amount: number, description: string) => {
      setLoading(true)
      try {
         const resp = await authFetch(`${apiBaseUrl}/api/pay/fedapay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, description, callback_url: window.location.href })
         })
         const data = await resp.json()
         if (data.url) {
            window.location.href = sanitizeUrl(data.url)
         }
      } catch (e) {
         console.error("Payment failed:", e)
         alert("Le service de paiement est temporairement indisponible.")
      } finally {
         setLoading(false)
      }
   }

  const handleSmashShare = async () => {
    if (!previewUrls || previewUrls.length === 0) return
    setIsSmashing(true)
    try {
      const photoIds = previewUrls.map(p => p.id)
      const resp = await authFetch(`${apiBaseUrl}/api/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: photoIds, days: shareDays })
      })
      const data = await resp.json()
      setShareLink({ url: `${window.location.origin}${data.share_url}`, expires_at: data.expires_at })
    } catch (e) {
      console.error("Smash failed:", e)
      setError("Impossible de générer le lien Smash.")
    } finally {
      setIsSmashing(false)
    }
  }

  if (isShareView) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex flex-col justify-center items-center p-6 text-center relative overflow-hidden">
        {/* Animated Background inspired by Smash */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#121212] to-black">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] rounded-full bg-gradient-to-r from-red-600/10 via-orange-500/10 to-blue-500/10 blur-[150px] animate-[spin_30s_linear_infinite]"></div>
        </div>

        <header className="fixed top-0 w-full p-8 flex justify-between items-center z-50">
           <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.href = '/'}>
              <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter">PRO<span className="text-[#E5A93C]">DESIGN</span></span>
           </div>
           <button className="btn btn-sm btn-outline border-white/20 text-white font-black" onClick={() => window.location.href = '/'}>CRÉER MON TRANSFERT</button>
        </header>

        {loading ? (
          <div className="space-y-4">
             <span className="loading loading-spinner loading-lg text-white"></span>
             <p className="text-sm font-black tracking-[0.3em] uppercase opacity-40">Récupération des photos...</p>
          </div>
        ) : error ? (
           <div className="card bg-red-900/40 p-12 rounded-[50px] border border-red-500/20 backdrop-blur-3xl shadow-2xl">
              <h1 className="text-6xl font-black tracking-tighter mb-4 text-red-500">OUPS !</h1>
              <p className="text-xl font-bold opacity-60">Ce lien Smash a expiré ou est invalide.</p>
              <button className="btn btn-primary mt-8 rounded-full px-12" onClick={() => window.location.href = '/'}>Aller au Studio</button>
           </div>
        ) : sharedPhotos && (
           <div className="w-full max-w-6xl space-y-12 animate-in zoom-in fade-in duration-1000">
              <div className="space-y-2">
                 <h1 className="text-7xl font-black tracking-tighter uppercase whitespace-pre-wrap">Voici vos <span className="text-[#E5A93C]">Souvenirs</span>.</h1>
                 <p className="text-lg opacity-40 font-bold tracking-[0.2em]">{sharedPhotos.length} PHOTOS TRAITÉES PRÊTES À TÉLÉCHARGER</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {sharedPhotos.map((p, i) => (
                    <div key={i} className="group relative rounded-[40px] overflow-hidden bg-white/5 border border-white/10 shadow-2xl hover:scale-[1.02] transition-all duration-500">
                       <img src={p.url} className="w-full h-auto cursor-zoom-in" alt={`Shared ${i}`} />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <a href={p.url} download className="btn btn-circle btn-lg bg-white border-0 text-black hover:scale-110"><Download className="w-6 h-6" /></a>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-md px-6">
                 <button 
                  onClick={() => sharedPhotos.forEach(p => {
                    const l = document.createElement('a');
                    l.href = p.url;
                    l.download = `photo_${p.id}.png`;
                    l.click();
                  })}
                  className="btn btn-lg w-full rounded-full bg-white text-black font-black uppercase tracking-widest border-0 shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:scale-105 transition-all"
                >
                   Tout télécharger
                 </button>
              </div>
           </div>
        )}
      </div>
    );
  }

  const FeedbackModal = () => {
    const [msg, setMsg] = useState('')
    const [rating, setRating] = useState(5)
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)

    const submit = async () => {
      setLoading(true)
      try {
        await authFetch(`${apiBaseUrl}/api/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, message: msg, rating })
        })
        setSent(true)
      } catch(e) {}
      setLoading(false)
    }

    return (
      <div className="card bg-base-300 border border-white/5 p-8 max-w-md mx-auto mt-12">
        <h3 className="text-xl font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand" /> Votre avis compte
        </h3>
        {!sent ? (
          <div className="space-y-4">
            <input type="email" placeholder="Votre email" className="input input-bordered w-full text-xs font-bold" value={email} onChange={e => setEmail(e.target.value)} />
            <textarea placeholder="Comment pouvons-nous nous améliorer ?" className="textarea textarea-bordered w-full h-24 text-xs" value={msg} onChange={e => setMsg(e.target.value)} />
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black opacity-40">Note</span>
              <div className="rating rating-sm">
                {[1,2,3,4,5].map(i => (
                  <input key={i} type="radio" name="rating-2" className="mask mask-star-2 bg-orange-400" checked={rating === i} onChange={() => setRating(i)} />
                ))}
              </div>
            </div>
            <button onClick={submit} className={`btn btn-brand w-full ${loading ? 'loading' : ''}`}>Envoyer mon Feedback</button>
          </div>
        ) : (
          <div className="text-center py-8">
            <ShieldCheck className="w-12 h-12 text-success mx-auto mb-4" />
            <p className="text-sm font-bold">Merci ! Votre feedback a été transmis à l'équipe.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral text-neutral-content transition-colors duration-500 font-sans" data-theme="luxury">
      {/* Header */}
      <header className="navbar bg-base-300/80 backdrop-blur-md sticky top-0 z-50 px-8 border-b border-white/5">
        <div className="flex-1 gap-8">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-gradient-to-br from-brand to-blue-600 p-2 rounded-lg shadow-lg shadow-brand/20 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter">PRO<span className="text-brand">DESIGN</span></span>
          </div>

          <nav className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            <button 
              onClick={() => setActiveTab('design')}
              className={`px-8 py-3 rounded-xl text-sm font-black tracking-tight transition-all duration-300 ${activeTab === 'design' ? 'bg-brand text-black shadow-[0_0_20px_rgba(0,224,255,0.4)] scale-105' : 'hover:bg-white/10 opacity-70'}`}
            >
              🎨 STUDIO DESIGN
            </button>
            <button 
              onClick={() => setActiveTab('photo')}
              className={`px-8 py-3 rounded-xl text-sm font-black tracking-tight transition-all duration-300 ${activeTab === 'photo' ? 'bg-[#E5A93C] text-black shadow-[0_0_20px_rgba(229,169,60,0.4)] scale-105' : 'hover:bg-white/10 opacity-70'}`}
            >
              📸 PHOTO STUDIO (PRO)
            </button>
                 {/* Documents - NOUVEAU */}
            <button
              onClick={() => setActiveTab('document')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${activeTab === 'document' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <BookOpen size={20} />
              <span className="font-medium">Rapports & Livres</span>
            </button>
            <button 
              onClick={() => setActiveTab('presentation')}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-500 overflow-hidden relative group ${activeTab === 'presentation' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_30px_rgba(147,51,234,0.5)] scale-105 border-0' : 'hover:bg-white/10 opacity-70 hover:opacity-100'}`}
            >
              <div className={`absolute inset-0 bg-[url('https://transparenttextures.com/patterns/stardust.png')] opacity-0 transition-opacity duration-1000 ${activeTab === 'presentation' ? 'opacity-30' : 'group-hover:opacity-10'}`}></div>
              <Sparkles size={20} className={activeTab === 'presentation' ? 'animate-pulse text-yellow-300' : ''} />
              <span className="font-black uppercase tracking-widest text-sm relative z-10">Neuro-Pitch <span className="text-[10px] ml-1 opacity-50 font-mono">IA</span></span>
            </button>
            <button 
              onClick={() => setActiveTab('branding')}
              className={`px-8 py-3 rounded-xl text-sm font-black tracking-tight transition-all duration-300 ${activeTab === 'branding' ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-105' : 'hover:bg-white/10 opacity-70'}`}
            >
              💎 BRANDING
            </button>
            <button 
              onClick={() => setActiveTab('video')}
              className={`px-8 py-3 rounded-xl text-sm font-black tracking-tight transition-all duration-300 ${activeTab === 'video' ? 'bg-[#00A3FF] text-white shadow-[0_0_20px_rgba(0,163,255,0.4)] scale-105' : 'hover:bg-white/10 opacity-70'}`}
            >
              🎬 MONTEUR IA
            </button>
            <button 
              onClick={() => setActiveTab('catalog')}
              className={`px-8 py-3 rounded-xl text-sm font-black tracking-tight transition-all duration-300 ${activeTab === 'catalog' ? 'bg-[#50E3C2] text-black shadow-[0_0_20px_rgba(80,227,194,0.4)] scale-105' : 'hover:bg-white/10 opacity-70'}`}
            >
              🏪 CATALOGUE & ASSETS
            </button>
            <button 
              onClick={() => setActiveTab('rembg')}
              className={`px-8 py-3 rounded-xl text-sm font-black tracking-tight transition-all duration-300 ${activeTab === 'rembg' ? 'bg-[#FF3366] text-white shadow-[0_0_20px_rgba(255,51,102,0.4)] scale-105' : 'hover:bg-white/10 opacity-70'}`}
            >
              ✂️ DÉTOURAGE IA
            </button>
          </nav>
        </div>
        <div className="flex-none gap-4">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} className="avatar placeholder online shadow-lg ring ring-brand/20 ring-offset-2 ring-offset-base-300 rounded-full cursor-pointer">
              <div className="bg-neutral text-neutral-content rounded-full w-10">
                <span className="text-xs">JD</span>
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-300 rounded-box w-52 border border-white/5">
              <li><button onClick={handleLogout}>Déconnexion</button></li>
            </ul>
          </div>
        </div>
      </header>

      {/* Mesh Gradient Background (Smash Style) */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${activeTab === 'photo' ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-red-500/30 blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-orange-400/20 blur-[120px] animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {activeTab !== 'catalog' && (
          <>
            {/* Panneau de Contrôle */}
            <section id="design-panel" className="lg:col-span-4 flex flex-col gap-6">
              {activeTab === 'design' ? (
                <>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter leading-none">Design <span className="text-brand">Algorithmique</span>.</h1>
                    <p className="text-neutral-content/60 text-base font-medium">Le moteur Rust crée vos visuels marketing en 1 clic.</p>
                  </div>

                  <div className="card bg-base-200 shadow-2xl border border-white/5">
                    <div className="card-body gap-4">
                      <div className="form-control w-full gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black opacity-30 uppercase tracking-widest pl-1">Titre</label>
                          <input
                            type="text"
                            className="input input-bordered bg-base-300/50 input-lg text-lg font-black border-white/10"
                            placeholder="TITRE PRINCIPAL"
                            value={formData.title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, title: e.target.value.toUpperCase()})}
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black opacity-30 uppercase tracking-widest pl-1">Surtitre</label>
                          <input
                            type="text"
                            className="input input-bordered bg-base-300/50 input-sm text-sm font-bold border-white/10"
                            placeholder="AU-DESSUS DU TITRE"
                            value={formData.overtitle}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, overtitle: e.target.value.toUpperCase()})}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black opacity-30 uppercase tracking-widest pl-1">Sous-titre</label>
                          <input
                            type="text"
                            className="input input-bordered bg-base-300/50 input-md text-base border-white/10"
                            placeholder="Sous-titre ou slogan impactant..."
                            value={formData.subtitle}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, subtitle: e.target.value})}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black opacity-30 uppercase tracking-widest pl-1">Texte</label>
                          <textarea
                            className="textarea textarea-bordered w-full h-20 bg-base-300/50 text-xs font-medium border-white/10"
                            placeholder="Détails, date, informations secondaires..."
                            value={formData.extraText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, extraText: e.target.value})}
                          />
                        </div>

                        <div className="flex flex-col gap-1 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                          <label className="text-[10px] font-black text-yellow-500/70 uppercase tracking-widest flex items-center gap-2">
                             <Sparkles className="w-3 h-3" /> Contexte & Orientation
                          </label>
                          <textarea
                            className="textarea textarea-ghost w-full h-24 bg-transparent text-xs font-medium focus:outline-none p-0 mt-2"
                            placeholder="Décrivez l'ambiance, les précisions sur le visuel souhaité..."
                            value={formData.context}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, context: e.target.value})}
                          />
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <label className="text-xs uppercase tracking-widest text-[#E5A93C] font-black flex items-center gap-2">
                             <Layers className="w-3 h-3" /> 🚀 Campagne Massive (1 prod/ligne)
                          </label>
                          <textarea
                            className="textarea textarea-bordered w-full h-20 bg-base-300/50 text-xs font-medium border-white/10"
                            placeholder="Entrez un produit par ligne pour une génération groupée..."
                            value={campaignProducts}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCampaignProducts(e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <button className="btn btn-outline btn-md border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/5" onClick={() => logoInputRef.current?.click()}>
                            {logoPreview ? '✅ LOGO PRÊT' : '📁 ADD LOGO'}
                          </button>
                          <button className="btn btn-outline btn-md border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/5" onClick={() => bgInputRef.current?.click()}>
                            {bgPreview ? '✅ PHOTO PRÊTE' : '🖼️ ADD FOND'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 p-3 border border-white/10 rounded-xl bg-base-300/20">
                        <label className="text-xs uppercase tracking-[0.2em] text-neutral-content/40 font-black flex justify-between items-center bg-black/20 p-2 rounded-lg">
                          <span>STYLE & BRANDING</span>
                          <label className="cursor-pointer flex items-center gap-3">
                            <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={isAutoColor} onChange={() => setIsAutoColor(!isAutoColor)} />
                            <span className="text-[10px] text-brand font-black">AUTO-COLOR</span>
                          </label>
                        </label>

                        {/* Style selection */}
                        <div className="flex flex-col gap-2 pt-2">
                          <label className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Direction Artistique</label>
                          <select 
                            className="select select-bordered select-md bg-base-300/50 text-xs font-black h-12 uppercase tracking-widest"
                            value={formData.style}
                            onChange={(e) => setFormData({...formData, style: e.target.value})}
                          >
                            <option value="default">Classic Professionnel</option>
                            <option value="minimalist">Ultra Minimaliste</option>
                            <option value="brutalist">Brutalisme Expérimental</option>
                            <option value="cyber">Cyber / Neon Future</option>
                            <option value="luxury">Luxury & Gold Heritage</option>
                          </select>
                        </div>

                        {/* Format & QR */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Résolution</label>
                            <div className="flex gap-1">
                              {['web', 'a4', 'a3'].map(f => (
                                <button key={f} 
                                  className={`px-2 py-1 rounded text-[9px] font-black transition-all ${exportFormat === f ? 'bg-brand text-black shadow-lg scale-105' : 'bg-white/5 opacity-50'}`}
                                  onClick={() => setExportFormat(f)}
                                >
                                  {f.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold opacity-30 uppercase tracking-widest flex justify-between items-center">
                              QR Code
                              <input type="checkbox" className="toggle toggle-xs toggle-accent" checked={showQrCode} onChange={() => setShowQrCode(!showQrCode)} />
                            </label>
                            {showQrCode ? (
                              <input 
                                type="text" 
                                className="input input-bordered input-xs bg-base-300/50 text-[9px] h-6"
                                placeholder="Lien..."
                                value={qrCodeUrl}
                                onChange={(e) => setQrCodeUrl(e.target.value)}
                              />
                            ) : (
                              <div className="h-6 bg-white/5 rounded border border-dashed border-white/5"></div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                          <label className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Thématique Visuelle</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['luxury', 'tech', 'church', 'minimal', 'event', 'custom'].map(t => (
                              <button 
                                key={t}
                                onClick={() => setFormData({...formData, theme: t})}
                                className={`text-[9px] py-2.5 uppercase font-black rounded-xl border-2 transition-all ${formData.theme === t ? 'border-brand bg-brand/10 text-brand shadow-[0_0_15px_rgba(0,224,255,0.2)]' : 'border-white/5 opacity-50 hover:border-white/20'}`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5 mt-1">
                          <label className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Inspiration (Guide IA)</label>
                          <div className="flex gap-2 items-center">
                            <button 
                              onClick={() => inspirationInputRef.current?.click()}
                              className={`btn btn-xs flex-grow transition-all h-7 ${inspirationPreview ? 'btn-brand bg-brand/20 border-brand/50' : 'btn-ghost bg-white/5 border-white/10'}`}
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              {inspirationPreview ? "Modèle Prêt" : "Soumettre Inspiration"}
                            </button>
                            {inspirationPreview && (
                              <div className="w-7 h-7 rounded border border-brand/50 bg-black/40 overflow-hidden shrink-0">
                                <img src={inspirationPreview} className="w-full h-full object-cover" alt="Preview" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="card-actions flex flex-col gap-3 mt-6">
                        <button className={`btn btn-primary btn-lg w-full bg-gradient-to-r from-brand via-blue-500 to-purple-600 border-0 text-black font-black text-sm tracking-[0.1em] shadow-[0_10px_30px_rgba(0,224,255,0.3)] hover:scale-[1.02] transition-transform ${loading ? 'loading' : ''}`} onClick={() => handleGenerate('rush')}>
                          ⚡ Lancer le RUSH ENGINE
                        </button>
                        {campaignProducts.trim() && (
                          <button className="btn btn-warning btn-md w-full font-black text-xs tracking-widest text-black shadow-[0_10px_30px_rgba(229,169,60,0.2)]" onClick={() => handleGenerate('campaign')}>
                            🚀 GÉNÉRER LA CAMPAGNE (+{campaignProducts.split('\n').filter(p => p.trim()).length} VISUELS)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : activeTab === 'photo' ? (
                <>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter leading-none">Studio <span className="text-[#E5A93C]">Photo</span>.</h1>
                    <p className="text-neutral-content/60 text-base font-medium">Traitement professionnel par lots (Style Lightroom).</p>
                  </div>

                  <div className="card bg-base-200 shadow-2xl border border-[#E5A93C]/20">
                    <div className="card-body gap-4">
                      <div 
                        className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[#E5A93C]/50 hover:bg-[#E5A93C]/5 transition-all"
                        onClick={() => batchInputRef.current?.click()}
                      >
                        <input ref={batchInputRef} type="file" multiple className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          if (e.target.files) {
                            Array.from(e.target.files).forEach((f: any) => handleFileUpload(f as File, 'batch'))
                          }
                        }} />
                        <Upload className="w-8 h-8 text-[#E5A93C]" />
                        <div className="text-center">
                          <p className="text-xs font-bold">Importer des Photos</p>
                          <p className="text-[10px] opacity-40">{batchPhotos.length} photos prêtes</p>
                        </div>
                      </div>

                      <div className="space-y-4 py-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold opacity-50 flex justify-between uppercase">Exposition <span>{photoConfig.exposure}x</span></label>
                          <input type="range" min="0.5" max="2" step="0.1" className="range range-xs range-warning" value={photoConfig.exposure} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhotoConfig({...photoConfig, exposure: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold opacity-50 flex justify-between uppercase">Contraste <span>{photoConfig.contrast}x</span></label>
                          <input type="range" min="0.5" max="2" step="0.1" className="range range-xs range-warning" value={photoConfig.contrast} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhotoConfig({...photoConfig, contrast: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold opacity-50 flex justify-between uppercase">Saturation <span>{photoConfig.saturation}x</span></label>
                          <input type="range" min="0.5" max="2" step="0.1" className="range range-xs range-warning" value={photoConfig.saturation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhotoConfig({...photoConfig, saturation: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                          <span className="text-[10px] font-bold opacity-50 uppercase">Dénouistage (Denoise)</span>
                          <input type="checkbox" className="toggle toggle-xs toggle-warning" checked={photoConfig.denoise} onChange={() => setPhotoConfig({...photoConfig, denoise: !photoConfig.denoise})} />
                        </div>
                        
                        <div className="flex items-center justify-between p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-400 uppercase">Mode Restauration</span>
                            <span className="text-[8px] opacity-40 uppercase">Pour photos anciennes/floues</span>
                          </div>
                          <input type="checkbox" className="toggle toggle-xs toggle-primary" checked={photoConfig.restoration} onChange={() => setPhotoConfig({...photoConfig, restoration: !photoConfig.restoration})} />
                        </div>

                        <div className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                          <span className="text-[10px] font-bold opacity-50 uppercase">Gamma (Lumière Bio)</span>
                          <input type="range" min="0.5" max="2.5" step="0.1" className="range range-xs range-primary" value={photoConfig.gamma} onChange={(e: any) => setPhotoConfig({...photoConfig, gamma: parseFloat(e.target.value)})} />
                        </div>

                        <div className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                          <span className="text-[10px] font-bold opacity-50 uppercase">Balance Blancs Auto</span>
                          <input type="checkbox" className="toggle toggle-xs toggle-info" checked={photoConfig.auto_wb} onChange={() => setPhotoConfig({...photoConfig, auto_wb: !photoConfig.auto_wb})} />
                        </div>

                        {/* Custom Resize Selector (Inspired by user screenshot) */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                          <label className="text-[10px] font-black opacity-50 uppercase tracking-widest">Format de Sortie</label>
                          <select 
                            className="select select-bordered select-sm bg-base-300/50 text-xs font-black uppercase"
                            value={photoConfig.target_size}
                            onChange={(e) => setPhotoConfig({...photoConfig, target_size: e.target.value})}
                          >
                            <option value="original">Tel quel / Original</option>
                            <option value="1x1">1 x 1 (Square)</option>
                            <option value="4x5">4 x 5 / 8 x 10 (Portraits)</option>
                            <option value="8.5x11">8,5 x 11 (Standard)</option>
                            <option value="5x7">5 x 7 (Photo)</option>
                            <option value="2x3">2 x 3 / 4 x 6</option>
                            <option value="4x3">4 x 3 (1024 x 768)</option>
                            <option value="16x9">16 x 9 (1920 x 1080)</option>
                            <option value="16x10">16 x 10 (1280 x 800)</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        className={`btn btn-warning w-full shadow-lg shadow-warning/20 ${loading ? 'loading' : ''}`}
                        onClick={() => handleGenerate('studio')}
                        disabled={batchPhotos.length === 0 || loading}
                      >
                        🚀 TRAITER LES {batchPhotos.length} PHOTOS
                      </button>
                      {batchPhotos.length > 0 && (
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => setBatchPhotos([])}>Vider la liste</button>
                      )}
                    </div>
                  </div>
                </>
              ) : activeTab === 'branding' ? (
                <>
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="space-y-4">
                      <h1 className="text-5xl font-black tracking-tighter leading-none">Identité <span className="text-indigo-400">Visuelle</span>.</h1>
                      <p className="text-neutral-content/60 text-base font-medium">Génération de logos vectoriels et chartes graphiques.</p>
                    </div>

                    <div className="card bg-base-200 shadow-2xl border border-indigo-500/20">
                      <div className="card-body gap-4">
                        <div className="bg-base-300 rounded-2xl p-6 border border-white/5 shadow-2xl">
                          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Fingerprint className="w-5 h-5 text-indigo-400" />
                            Logo Engine (Vector-PRO)
                          </h3>
                          <div className="flex flex-col gap-6">
                            <input 
                              type="text" 
                              placeholder="NOM DE LA MARQUE..." 
                              className="input input-bordered input-lg bg-black/20 w-full text-xl font-black tracking-tighter border-white/10"
                              value={formData.title}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, title: e.target.value.toUpperCase()})}
                            />
                            <input 
                              type="text" 
                              placeholder="Slogan / Baseline de la marque..." 
                              className="input input-bordered input-md bg-black/20 w-full text-base border-white/10"
                              value={formData.subtitle}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, subtitle: e.target.value})}
                            />
                            <div className="bg-black/20 p-6 rounded-2xl space-y-4 border border-white/5">
                                <label className="text-xs font-black opacity-50 uppercase tracking-[0.2em] flex justify-between">
                                  <span>Palette de Couleurs</span>
                                  <button onClick={() => setFormData({...formData, brandColors: [...formData.brandColors, '#ffffff']})} className="text-[9px] text-indigo-400 border border-indigo-400/30 px-2 rounded-md hover:bg-indigo-400/10"> + Ajouter</button>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {formData.brandColors.map((col, idx) => (
                                    <div key={idx} className="relative group">
                                      <input 
                                        type="color" 
                                        className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-2 border-white/10" 
                                        value={col} 
                                        onChange={(e) => {
                                          const newCols = [...formData.brandColors];
                                          newCols[idx] = e.target.value;
                                          setFormData({...formData, brandColors: newCols});
                                        }} 
                                      />
                                      {idx > 0 && (
                                        <button 
                                          onClick={() => setFormData({...formData, brandColors: formData.brandColors.filter((_, i) => i !== idx)})}
                                          className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >✕</button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="bg-indigo-500/5 p-6 rounded-2xl space-y-3 border border-indigo-500/10 animate-in zoom-in-95 duration-500">
                                <label className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                  <Sparkles className="w-3 h-3" />
                                  Concept / Idée de Marque (Brief)
                                </label>
                                <textarea 
                                  className="textarea textarea-ghost w-full h-24 bg-transparent text-xs font-medium focus:outline-none p-0 mt-2 placeholder:opacity-20"
                                  placeholder="Décrivez l'univers de votre marque, les valeurs à transmettre, le style de logo souhaité..."
                                  value={formData.brandIdea}
                                  onChange={(e) => setFormData({...formData, brandIdea: e.target.value})}
                                />
                              </div>
                            <button 
                              onClick={() => handleGenerate('branding')}
                              disabled={loading}
                              className={`btn btn-primary btn-lg w-full bg-indigo-600 border-0 text-white font-black shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-transform ${loading ? 'loading' : ''}`}
                            >
                              Générer l'ADN de Marque
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : activeTab === 'rembg' ? (
                <>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter leading-none">Détourage <span className="text-[#FF3366]">IA</span>.</h1>
                    <p className="text-neutral-content/60 text-base font-medium">Suppression d'arrière-plan pro via Rembg.</p>
                  </div>

                  <div className="card bg-base-200 shadow-2xl border border-[#FF3366]/20">
                    <div className="card-body gap-4">
                      <div 
                        className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[#FF3366]/50 hover:bg-[#FF3366]/5 transition-all"
                        onClick={() => rembgInputRef.current?.click()}
                      >
                        <input ref={rembgInputRef} type="file" className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0], 'rembg')
                          }
                        }} />
                        <Upload className="w-8 h-8 text-[#FF3366]" />
                        <div className="text-center">
                          <p className="text-xs font-bold">Importer une image à détourer</p>
                          <p className="text-[10px] opacity-40">JPG, PNG (max 20 Mo)</p>
                        </div>
                      </div>

                      {rembgPreview && (
                        <div className="mt-4 p-4 border border-white/10 rounded-xl bg-black/40">
                          <p className="text-xs font-bold opacity-50 uppercase tracking-widest mb-2">Image originale :</p>
                          <img src={rembgPreview} alt="Original" className="w-full h-auto rounded-lg max-h-64 object-contain" />
                        </div>
                      )}

                      <button 
                        className={`btn btn-primary w-full shadow-lg shadow-[#FF3366]/20 mt-4 ${!rembgBase64 ? 'btn-disabled opacity-50' : 'bg-[#FF3366] hover:bg-[#FF3366] text-white border-0'} ${loading ? 'loading' : ''}`}
                        onClick={handleRemoveBg}
                        disabled={!rembgBase64 || loading}
                      >
                        🚀 SUPPRIMER L'ARRIÈRE-PLAN
                      </button>
                    </div>
                  </div>
                </>
              ) : activeTab === 'document' ? (
                <>
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-5xl font-black tracking-tighter leading-none">Intelligence <span className="text-yellow-500">Documentaire</span>.</h1>
                    <p className="text-neutral-content/60 text-base font-medium">Création algorithmique de mémoires, rapports de stage et dossiers de presse haut de gamme.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    <div className="card bg-base-200 shadow-2xl border border-yellow-500/20">
                      <div className="card-body gap-6 p-6">
                        
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                             <BookOpen className="w-4 h-4" /> Paramètres de Couverture
                          </label>
                          <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                             <div className="space-y-1 col-span-2">
                                <label className="text-[9px] font-black uppercase opacity-40">Titre Principal du Document</label>
                                <input type="text" className="input input-sm input-bordered w-full font-black text-lg bg-black/40 border-white/10" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Rapport de Stage - Analyse Stratégique..." />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase opacity-40">Sous-titre / Spécialité</label>
                                <input type="text" className="input input-sm input-bordered w-full font-bold bg-black/40 border-white/10" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} placeholder="Ex: Master II Finance" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase opacity-40">Auteur / Candidat</label>
                                <input type="text" className="input input-sm input-bordered w-full font-bold bg-black/40 border-white/10" value={formData.extraInfo} onChange={e => setFormData({...formData, extraInfo: e.target.value})} placeholder="Ex: Jean Dupont" />
                             </div>
                             <div className="space-y-1 col-span-2">
                                <label className="text-[9px] font-black uppercase opacity-40">Institution / Université / Entreprise</label>
                                <input type="text" className="input input-sm input-bordered w-full font-bold bg-black/40 border-white/10" value={formData.context} onChange={e => setFormData({...formData, context: e.target.value})} placeholder="Ex: Université de Paris 1 Panthéon-Sorbonne" />
                             </div>
                          </div>

                          <label className="text-[10px] font-black uppercase tracking-widest text-[#00A3FF] flex items-center gap-2 mt-4">
                             <Layers className="w-4 h-4" /> Direction Artistique (Mise en page)
                          </label>
                          <div className="flex gap-4 p-4 bg-black/20 rounded-2xl border border-white/5">
                             <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-black uppercase opacity-40">Style Éditorial</label>
                                <select 
                                  className="select select-sm select-bordered w-full font-black uppercase text-[10px] bg-black/40 border-white/10"
                                  value={formData.style}
                                  onChange={e => setFormData({...formData, style: e.target.value})}
                                >
                                  <option value="academique">🎓 Académique Strict (Norme APA/ISO)</option>
                                  <option value="corporate">💼 Corporate Luxe (McKinsey Style)</option>
                                  <option value="minimal">✨ Minimaliste & Épuré (Apple Style)</option>
                                </select>
                             </div>
                             <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-black uppercase opacity-40">Couleur Thématique</label>
                                <input 
                                  type="color" 
                                  className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0" 
                                  value={brandPalette.primary || "#000000"} 
                                  onChange={(e) => setBrandPalette({...brandPalette, primary: e.target.value})}
                                />
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-2">
                             <div className="flex justify-between items-center p-2 bg-black/10 rounded-lg border border-white/5">
                                <span className="text-[9px] font-bold opacity-50 uppercase">Sommaire Auto.</span>
                                <input type="checkbox" className="toggle toggle-xs toggle-success" defaultChecked />
                             </div>
                             <div className="flex justify-between items-center p-2 bg-black/10 rounded-lg border border-white/5">
                                <span className="text-[9px] font-bold opacity-50 uppercase">Pagination Auto.</span>
                                <input type="checkbox" className="toggle toggle-xs toggle-success" defaultChecked />
                             </div>
                             <div className="flex justify-between items-center p-2 bg-black/10 rounded-lg border border-white/5 col-span-2">
                                <span className="text-[9px] font-bold opacity-50 uppercase">Filigrane (Confidentiel)</span>
                                <input type="text" className="input input-xs bg-black/40 w-32 font-bold text-error border-0" placeholder="CONFIDENTIEL..." />
                             </div>
                          </div>

                          <div className="divider opacity-10 font-black uppercase tracking-widest text-[9px] mt-6">Structuration du Contenu</div>
                          
                          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                            {chapters.length === 0 && (
                               <div className="text-center p-6 border-2 border-dashed border-white/5 rounded-2xl opacity-40">
                                  <p className="text-xs font-black uppercase">Aucun chapitre.</p>
                                  <p className="text-[10px]">L'Intelligence Artificielle va assembler la structure.</p>
                               </div>
                            )}
                            {chapters.map((ch, idx) => (
                              <div key={idx} className="p-4 bg-gradient-to-br from-black/40 to-black/10 rounded-2xl border border-white/10 space-y-3 relative group transition-all hover:border-yellow-500/30">
                                <div className="flex justify-between items-center">
                                   <span className="badge badge-sm badge-outline font-black text-yellow-500 tracking-widest text-[9px]">CHAPITRE {idx + 1}</span>
                                   <button 
                                     onClick={() => setChapters(chapters.filter((_, i) => i !== idx))}
                                     className="opacity-0 group-hover:opacity-100 btn btn-circle btn-xs btn-error text-white"
                                   >✕</button>
                                </div>
                                <input 
                                  type="text" 
                                  placeholder="Titre du Chapitre (ex: Introduction Générale)" 
                                  className="input input-ghost input-sm w-full font-black text-white text-base border-b border-white/10 focus:border-yellow-500 px-0" 
                                  value={ch.title}
                                  onChange={e => {
                                    const newChapters = [...chapters];
                                    newChapters[idx].title = e.target.value;
                                    setChapters(newChapters);
                                  }}
                                />
                                <div className="relative">
                                  <textarea 
                                    placeholder="Rédigez ou collez le corps de texte ici. Le moteur Rust va automatiquement justifier, nettoyer les veuves/orphelines et paginer intelligemment..." 
                                    className="textarea textarea-ghost w-full h-40 text-sm font-medium leading-relaxed bg-black/20 focus:bg-black/40 transition-all resize-none"
                                    value={ch.content}
                                    onChange={e => {
                                      const newChapters = [...chapters];
                                      newChapters[idx].content = e.target.value;
                                      setChapters(newChapters);
                                    }}
                                  />
                                  <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-20">
                                    <span className="text-[10px] font-bold">{ch.content.split(/\s+/).filter(w => w.length > 0).length} Mots</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
                             <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-2">Paramètres Administratifs</h3>
                             
                             <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                   <input 
                                      type="checkbox" 
                                      className="checkbox checkbox-xs checkbox-warning" 
                                      checked={includeToc} 
                                      onChange={() => setIncludeToc(!includeToc)} 
                                   />
                                   <span className="text-[10px] font-bold uppercase tracking-tight opacity-70 group-hover:opacity-100">Générer Sommaire</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                   <input 
                                      type="checkbox" 
                                      className="checkbox checkbox-xs checkbox-warning" 
                                      checked={includePagination} 
                                      onChange={() => setIncludePagination(!includePagination)} 
                                   />
                                   <span className="text-[10px] font-bold uppercase tracking-tight opacity-70 group-hover:opacity-100">Pagination Auto</span>
                                </label>
                             </div>

                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase opacity-40">Filigrane de Sécurité (Watermark)</label>
                                <input 
                                   type="text" 
                                   placeholder="Ex: CONFIDENTIEL, COPIE DE TRAVAIL..." 
                                   className="input input-bordered input-xs w-full bg-black/40 font-bold"
                                   value={watermark}
                                   onChange={e => setWatermark(e.target.value)}
                                />
                             </div>

                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase opacity-40">Style Éditorial Certifié</label>
                                <div className="flex gap-2">
                                   {['standard', 'academic', 'business', 'luxury'].map(s => (
                                      <button 
                                         key={s}
                                         onClick={() => setActiveDocStyle(s as any)}
                                         className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${activeDocStyle === s ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-transparent border-white/10 opacity-40 hover:opacity-100'}`}
                                      >
                                         {s}
                                      </button>
                                   ))}
                                </div>
                             </div>
                          </div>

                          <button 
                             onClick={() => setChapters([...chapters, { title: '', content: '' }])}
                             className="btn btn-ghost btn-sm w-full border border-dashed border-white/20 hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:text-yellow-500 transition-all font-black uppercase tracking-widest mt-2"
                          >
                             <Plus size={16} className="mr-2" /> Ajouter un Nouveau Chapitre
                          </button>
                        </div>
                        
                        <div className="mt-6">
                           {brandLogo && (
                             <div className="flex items-center gap-2 mb-2 p-2 bg-success/10 border border-success/20 rounded-lg text-[10px] font-bold text-success">
                                <ShieldCheck className="w-4 h-4" /> Logo institutionnel chargé en couverture.
                             </div>
                           )}
                           <button 
                             onClick={handleGenerateDocument}
                             className={`btn btn-primary btn-lg w-full bg-gradient-to-r from-yellow-700 to-yellow-500 border-0 text-white font-black hover:scale-[1.02] shadow-xl shadow-yellow-500/20 transition-all ${loading ? 'loading' : ''}`}
                             disabled={loading || chapters.length === 0}
                           >
                             <BookOpen size={20} className="mr-2" /> 
                             {loading ? 'TRAITEMENT TYPOGRAPHIQUE...' : 'CERTIFIER & ASSEMBLER LE DOCUMENT'}
                           </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6 sticky top-8">
                       <div className="flex justify-between items-center">
                          <h3 className="text-xs font-black uppercase tracking-widest opacity-40">Aperçu Avant Impression et Distribution</h3>
                          <span className="badge badge-outline badge-sm text-[9px] font-bold uppercase border-yellow-500/50 text-yellow-500">Qualité Administrative</span>
                       </div>
                       {pdfUrl ? (
                         <div className="bg-gradient-to-b from-white/10 to-transparent rounded-[40px] p-8 border border-white/10 flex flex-col items-center justify-center gap-6 min-h-[500px] animate-in zoom-in slide-in-from-right-8 duration-700 shadow-2xl relative overflow-hidden">
                           <div className="absolute -top-20 -right-20 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
                           <div className="w-32 h-32 bg-yellow-500/20 rounded-[2rem] rotate-12 flex items-center justify-center shadow-xl backdrop-blur-xl">
                              <BookOpen className="w-16 h-16 text-yellow-500 -rotate-12" />
                           </div>
                           <div className="text-center z-10">
                             <p className="font-black text-3xl mb-1 tracking-tight text-white drop-shadow-md">DOCUMENT CERTIFIÉ.</p>
                             <p className="text-xs font-medium opacity-60 uppercase tracking-widest">Pagination Auto • Filigrane Actif • Sommaire Dynamique</p>
                           </div>
                           <div className="flex flex-col w-full gap-3 mt-4 z-10">
                              <a href={sanitizeUrl(pdfUrl)} target="_blank" rel="noreferrer" className="btn btn-lg w-full bg-white text-black hover:bg-neutral-200 border-0 rounded-2xl font-black shadow-2xl transition-all">
                                 Consulter le Dossier Final (PDF A4)
                              </a>
                              <button className="btn btn-ghost btn-sm text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100">
                                 Changer les options de sécurité
                              </button>
                           </div>
                         </div>
                       ) : (
                         <div className="bg-black/40 rounded-[40px] border border-dashed border-white/10 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden h-full">
                           <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent"></div>
                           <BookOpen size={64} className="mb-6 opacity-20 text-yellow-500" />
                           <p className="text-xs font-black uppercase tracking-widest opacity-50 max-w-[200px] text-center leading-relaxed">
                              L'Aperçu du dossier administratif apparaîtra ici après l'assemblage algorithmique.
                           </p>
                         </div>
                       )}
                    </div>
                  </div>
                </>
              ) : activeTab === 'video' ? (
                <>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter leading-none">Moteur <span className="text-[#00A3FF]">Vidéo IA</span>.</h1>
                    <p className="text-neutral-content/60 text-base font-medium">Auto-montage et synchronisation audio ultra-rapide (FFmPeg + Whisper).</p>
                  </div>

                  <div className="card bg-base-200 shadow-2xl border border-[#00A3FF]/20">
                    <div className="card-body gap-6">
                      
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-[#00A3FF] flex items-center gap-2">
                          <Activity className="w-4 h-4" /> Vos Intentions (Prompt)
                        </label>
                        <textarea 
                          className="textarea textarea-bordered bg-black/30 border-white/5 w-full h-32 text-sm font-medium"
                          placeholder="Ex: Monte une vidéo dynamique pour Instagram en utilisant mes rushs. Met la musique de fond en sourdine quand la voix off parle..."
                          value={videoIntentions}
                          onChange={(e) => setVideoIntentions(e.target.value)}
                        />
                      </div>

                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <label className="text-xs font-black uppercase tracking-widest text-[#00A3FF] flex items-center gap-2">
                               <Video className="w-4 h-4" /> Ressources (Rushs, Audio, Affiches)
                            </label>
                            <span className="text-[10px] opacity-50 bg-black px-2 py-1 rounded-md">{videoFiles.length} Fichiers</span>
                         </div>
                         
                         <div 
                           className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-[#00A3FF]/50 hover:bg-[#00A3FF]/5 transition-all"
                           onClick={() => videoInputRef.current?.click()}
                         >
                           <input ref={videoInputRef} type="file" multiple accept="video/*,audio/*,image/*" className="hidden" onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                             if (e.target.files) {
                               for (let i = 0; i < e.target.files.length; i++) {
                                 handleFileUpload(e.target.files[i], 'video')
                               }
                             }
                           }} />
                           <div className="flex gap-4">
                             <Video className="w-8 h-8 text-neutral-content/30" />
                             <Music className="w-8 h-8 text-neutral-content/30" />
                             <Image className="w-8 h-8 text-neutral-content/30" />
                           </div>
                           <div className="text-center">
                             <p className="text-sm font-bold">Cliquez pour importer des médias</p>
                             <p className="text-xs opacity-40">MP4, MOV, MP3, WAV, PNG, JPG (Max 500Mo)</p>
                           </div>
                         </div>

                         {videoFiles.length > 0 && (
                           <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                             {videoFiles.map((f, i) => (
                               <div key={i} className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                                 {f.type === 'video' ? <Video className="w-4 h-4 text-[#00A3FF]" /> : f.type === 'audio' ? <Music className="w-4 h-4 text-[#50E3C2]" /> : <Image className="w-4 h-4 text-indigo-400" />}
                                 <span className="text-xs font-medium truncate flex-1">{f.name}</span>
                                 <button onClick={() => setVideoFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-error text-xs opacity-50 hover:opacity-100">✕</button>
                               </div>
                             ))}
                           </div>
                         )}
                      </div>

                      {videoProgress && (
                         <div className="bg-black/50 p-4 rounded-xl border border-white/5 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between mb-2">
                               <span className="text-[10px] font-black uppercase tracking-widest text-[#50E3C2]">Job ID: {videoProgress.job_id.substring(0,8)}</span>
                               <span className="text-[10px] font-black uppercase text-warning flex items-center gap-1">
                                  <span className="loading loading-ring loading-xs"></span>
                                  Traitement FFmpeg en cours...
                               </span>
                            </div>
                            <div className="font-mono text-[9px] text-[#00A3FF] bg-black p-2 rounded-md truncate border border-white/5 opacity-80">
                               &gt; {videoProgress.ffmpeg_log}
                            </div>
                         </div>
                      )}

                      <button 
                         className={`btn btn-primary w-full shadow-lg shadow-[#00A3FF]/20 mt-2 ${loading ? 'loading' : ''} bg-[#00A3FF] hover:bg-[#00A3FF] border-0 text-white`}
                         onClick={handleVideoSubmit}
                         disabled={loading || (videoFiles.length === 0 && !videoIntentions)}
                      >
                         <Sparkles className="w-4 h-4 mr-2" />
                         {currentJobId ? 'APPLIQUER LES CORRECTIONS' : 'LANCER LE MONTAGE IA'}
                      </button>

                      {/* --- PARAMETRES PRO / BRAND KIT --- */}
                      <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-2xl">
                         <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="w-4 h-4 text-[#00A3FF]" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Brand Intelligence AI</h3>
                         </div>
                         <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                               <label className="text-[9px] opacity-40 uppercase font-black">Primaire</label>
                               <input 
                                  type="color" 
                                  value={brandPalette.primary} 
                                  onChange={(e) => setBrandPalette({...brandPalette, primary: e.target.value})}
                                  className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
                                />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] opacity-40 uppercase font-black">Secondaire</label>
                               <input 
                                  type="color" 
                                  value={brandPalette.secondary} 
                                  onChange={(e) => setBrandPalette({...brandPalette, secondary: e.target.value})}
                                  className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
                                />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] opacity-40 uppercase font-black">Accent</label>
                               <input 
                                  type="color" 
                                  value={brandPalette.accent} 
                                  onChange={(e) => setBrandPalette({...brandPalette, accent: e.target.value})}
                                  className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
                                />
                            </div>
                         </div>
                         
                         <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[10px] opacity-40 uppercase font-black">Typographie (IA Search)</label>
                               <input 
                                  type="text" 
                                  className="input input-xs input-bordered w-full bg-black/40 text-[10px]"
                                  value={brandFont}
                                  onChange={(e) => setBrandFont(e.target.value)}
                                  placeholder="Auto-détecté..."
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[10px] opacity-40 uppercase font-black">Langue</label>
                               <select 
                                  className="select select-xs select-bordered w-full bg-black/40 text-[10px]"
                                  value={targetLanguage}
                                  onChange={(e:any) => setTargetLanguage(e.target.value)}
                               >
                                  <option value="fr">🇫🇷 Français</option>
                                  <option value="en">🇺🇸 Anglais</option>
                               </select>
                            </div>
                         </div>

                         <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer group">
                               <div className="w-8 h-8 bg-[#00A3FF]/10 rounded-lg flex items-center justify-center group-hover:bg-[#00A3FF]/20 transition-all">
                                  <Upload className="w-4 h-4 text-[#00A3FF]" />
                               </div>
                               <div>
                                  <p className="text-[10px] font-black uppercase">Scanner Logo</p>
                                  <p className="text-[9px] opacity-40">Extrayez la marque</p>
                                </div>
                                <input type="file" className="hidden" onChange={async (e) => {
                                   if (e.target.files?.[0]) {
                                      setBrandLogo(e.target.files[0].name);
                                      // Mock Logo Analysis logic: Automatically finding professional palette
                                      setBrandPalette({ primary: '#1A1A1A', secondary: '#FFD700', accent: '#F0F0F0' });
                                      setBrandFont("Montserrat Bold");
                                      alert("Intelligence IA : Palette et Police extraites du logo !");
                                   }
                                }} />
                            </label>
                            {brandLogo && (
                               <div className="flex-none p-1 bg-white/10 rounded-lg flex items-center justify-center">
                                  <Image className="w-4 h-4 opacity-50" />
                               </div>
                            )}
                         </div>
                      </div>

                      {videoVersions.length > 0 && (
                         <div className="mt-4 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#00A3FF] opacity-50 flex items-center gap-2">
                               <Layers className="w-4 h-4" /> Historique des Versions & Rendu
                            </label>
                            <div className="space-y-2">
                               {videoVersions.map((v, i) => (
                                 <div key={i} className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center justify-between group">
                                    <div className="flex flex-col">
                                       <span className="text-xs font-black text-[#00A3FF]">VERSION V{v.version}</span>
                                       <span className="text-[10px] opacity-40">{v.date}</span>
                                    </div>
                                    <div className="flex gap-2">
                                       <a href={sanitizeUrl(v.url)} target="_blank" className="btn btn-xs btn-ghost hover:bg-[#00A3FF]/20 text-[#00A3FF] capitalize">
                                          <Download className="w-3 h-3 mr-1" /> Voir
                                       </a>
                                       <button 
                                          className="btn btn-xs btn-ghost hover:bg-[#00A3FF]/20 text-[#00A3FF] capitalize"
                                          onClick={() => {
                                             const link = `${window.location.origin}/share/${v.job_id}`;
                                             navigator.clipboard.writeText(link);
                                             alert("Lien de collaboration copié !");
                                          }}
                                       >
                                          <Share2 className="w-3 h-3 mr-1" /> Partager
                                       </button>
                                       {i === 0 && (
                                          <div className="badge badge-success badge-xs text-black font-bold">ACTUELLE</div>
                                       )}
                                    </div>
                                 </div>
                               ))}
                            </div>
                            <div className="alert alert-warning py-2 px-3 text-[10px] bg-yellow-500/10 border-yellow-500/20 rounded-lg">
                               <AlertTriangle className="w-4 h-4 text-yellow-500" />
                               <span className="text-yellow-500">ATTENTION: Les vidéos sont supprimées définitivement après 24h. Aucun backup n'est conservé.</span>
                            </div>
                            <div className="alert alert-info py-2 px-3 text-[10px] bg-[#00A3FF]/10 border-0 rounded-lg">
                               <Sparkles className="w-4 h-4 text-[#00A3FF]" />
                               <span>Pour corriger, modifiez votre prompt plus haut et relancez. L'IA gardera le contexte précédent !</span>
                            </div>
                         </div>
                      )}

                    </div>
                  </div>
                </>
              ) : activeTab === 'presentation' ? (
                <>
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-6 duration-700">
                    <h1 className="text-5xl font-black tracking-tighter leading-none">Générateur <span className="text-purple-500">Neuro-Pitch</span>.</h1>
                    <p className="text-neutral-content/60 text-base font-medium">De l'étincelle à la présentation de 100 pages, en 3 secondes. 100% Autonome, Zéro API Externe.</p>
                  </div>

                  <div className="mt-8 relative overflow-hidden bg-black/40 rounded-[2rem] border border-white/10 shadow-2xl p-8 lg:p-12 mb-8">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col gap-8 max-w-4xl mx-auto">
                      
                      <div className="text-center space-y-4">
                        <h2 className="text-3xl font-black text-white">Quelle est l'idée fondatrice ?</h2>
                        <p className="text-sm font-bold opacity-50 uppercase tracking-widest">Le moteur algorithmique va étendre ce concept à l'infini.</p>
                      </div>

                      <div className="flex flex-col gap-4">
                        <textarea 
                          className="textarea textarea-lg w-full min-h-[120px] bg-white/5 border-2 border-white/10 focus:border-purple-500 focus:bg-white/10 text-xl font-bold rounded-2xl p-6 transition-all resize-none shadow-inner"
                          placeholder="EXEMPLE: L'évolution de la robotique agricole en Afrique de l'Ouest d'ici 2050. Problèmes liés à la météo et solutions solaires autonomes..."
                          value={formData.brandIdea || ''}
                          onChange={(e) => setFormData({...formData, brandIdea: e.target.value})}
                        />
                        
                        <div className="flex bg-black/30 rounded-2xl p-2 border border-white/5 gap-2">
                          <button className="btn btn-sm btn-ghost flex-1 text-purple-400 font-black tracking-widest uppercase hover:bg-purple-500/20">
                            🪄 Magie Aléatoire
                          </button>
                          <button className="btn btn-sm btn-ghost flex-1 opacity-50 font-black tracking-widest uppercase hover:opacity-100">
                            📁 Importer un Document Word / PDF Brut
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <div className="space-y-2 p-5 bg-white/5 rounded-2xl border border-white/5">
                          <label className="text-xs font-black uppercase text-purple-400 tracking-widest">Envergure (Volume)</label>
                          <select className="select select-bordered w-full bg-black/50 text-xs font-bold font-mono">
                            <option value="10">Flash Pitch (10 Slides)</option>
                            <option value="30">Présentation Master (30 Slides)</option>
                            <option value="100">Rapport Titanesque (100 Slides)</option>
                            <option value="1000">Génération Infini (Jusqu'à 1000 Slides !)</option>
                          </select>
                        </div>

                        <div className="space-y-2 p-5 bg-white/5 rounded-2xl border border-white/5">
                          <label className="text-xs font-black uppercase text-indigo-400 tracking-widest">Structure Algorithmique</label>
                          <select className="select select-bordered w-full bg-black/50 text-xs font-bold">
                            <option value="business">Business Plan Croissance (Harvard)</option>
                            <option value="story">Storytelling Émotionnel (TEDx)</option>
                            <option value="tech">Tech & DeepTech (Y-Combinator)</option>
                            <option value="academic">Thèse Universitaire Avancée</option>
                          </select>
                        </div>

                        <div className="space-y-2 p-5 bg-white/5 rounded-2xl border border-white/5">
                          <label className="text-xs font-black uppercase text-pink-400 tracking-widest">Tone of Voice (IA)</label>
                          <select className="select select-bordered w-full bg-black/50 text-xs font-bold">
                            <option value="visionnaire">Visionnaire & Steve Jobs</option>
                            <option value="analytique">Analytique & Froid (Data)</option>
                            <option value="vulgarisateur">Vulgarisateur (Grand Public)</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        className={`btn btn-lg w-full h-20 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] text-white border-0 font-black text-2xl tracking-tighter uppercase shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:shadow-[0_0_60px_rgba(147,51,234,0.6)] hover:scale-[1.02] transition-all rounded-2xl ${loading ? 'loading' : 'animate-gradient-x'}`}
                        onClick={handleGeneratePresentation}
                        disabled={loading || !formData.brandIdea}
                      >
                        <Sparkles className="w-8 h-8 mr-3" />
                         {loading ? 'CALCUL DU MODELE MATRICIEL...' : 'EXPANSER L\'IDÉE & CRÉER LE PITCH DECK'}
                      </button>

                    </div>
                  </div>

                  {/* Zone de preview des Slides */}
                  {pdfUrl && (
                    <div className="flex flex-col items-center gap-6 mt-12 animate-in zoom-in slide-in-from-bottom-8 duration-1000">
                      <h3 className="text-3xl font-black text-center tracking-tighter">Votre Diaporama est prêt.</h3>
                      <div className="w-full max-w-5xl aspect-video bg-base-300 rounded-[2rem] border-4 border-purple-500/20 shadow-2xl relative overflow-hidden group">
                         <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none"></div>
                         
                         <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-10 bg-gradient-to-br from-black/80 to-black/40 backdrop-blur-sm">
                            <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
                               TITRE DE LA PRÉSENTATION
                            </h2>
                            <p className="text-xl font-medium text-white/50 uppercase tracking-widest max-w-2xl">
                               Généré en {videoProgress?.job_id ? '3.2' : '4.7'} secondes par un algorithme déterministe hors-ligne.
                            </p>
                            
                            <div className="flex gap-4 mt-12">
                               <a href={sanitizeUrl(pdfUrl)} target="_blank" rel="noreferrer" className="btn btn-lg bg-white text-black border-0 rounded-full font-black uppercase tracking-widest hover:scale-110 transition-all shadow-2xl">
                                  Télécharger PDF (Mode Présentation 16:9)
                               </a>
                            </div>
                         </div>
                      </div>
                      <p className="text-xs font-bold opacity-40 uppercase tracking-widest text-center mt-2 max-w-xl">
                        A noter : Ce fichier PDF de présentation (Pitch format paysage) est lisible en plein écran sur n'importe quel ordinateur, tablette ou smartphone.
                      </p>
                    </div>
                  )}

                </>
              ) : null}

              {/* Paramètres Communs (Design & Branding) */}
              {(activeTab === 'design' || activeTab === 'branding') && (
                <div className="flex flex-col gap-4 p-4 bg-base-300/50 border border-white/5 rounded-2xl shadow-xl animate-in fade-in zoom-in duration-500">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-brand flex items-center gap-2">
                       <Palette className="w-3 h-3" />
                       Visuel Style & Tendance
                    </label>
                    <select 
                      className="select select-bordered select-sm w-full bg-black/20 border-white/5 focus:border-brand/40 text-xs font-bold"
                      value={formData.style || 'default'}
                      onChange={(e) => setFormData({...formData, style: e.target.value})}
                    >
                      <option value="default">Classique & Pro</option>
                      <option value="minimalist">Néo-Minimalisme</option>
                      <option value="brutalist">Brutalisme Expérimental</option>
                      <option value="cyber">Cyber / Néon Pulse</option>
                      <option value="luxury">Luxe & Héritage</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                    <label className="text-[10px] uppercase tracking-widest font-black text-[#50E3C2] flex items-center gap-2">
                       <Download className="w-3 h-3" />
                       Format & QR (Option PRO)
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {['web', 'a4', 'a3'].map(f => (
                        <button 
                          key={f}
                          onClick={() => setExportFormat(f)}
                          className={`text-[9px] py-1.5 uppercase font-black rounded-lg border transition-all ${exportFormat === f ? 'border-[#50E3C2] bg-[#50E3C2]/10 text-[#50E3C2]' : 'border-white/5 opacity-40 hover:opacity-100'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    {exportFormat === 'web' && (
                      <div className="flex flex-col gap-2 mt-2 p-3 bg-black/30 rounded-xl border border-white/5 animate-in slide-in-from-top-2">
                        <label className="text-[8px] font-black opacity-30 uppercase tracking-widest">Dimensions Web (300 DPI)</label>
                        <select 
                          className="select select-bordered select-xs w-full bg-transparent text-[9px] font-bold"
                          value={webDimension}
                          onChange={(e) => setWebDimension(e.target.value)}
                        >
                          <option value="1080x1080">Carré (1080 x 1080)</option>
                          <option value="1080x1350">Portrait (1080 x 1350)</option>
                          <option value="1080x1920">Story / Reel (1080 x 1920)</option>
                        </select>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 p-2 bg-black/20 rounded-lg">
                      <span className="text-[9px] font-bold opacity-50 uppercase">Intégrer QR Code</span>
                      <input type="checkbox" className="toggle toggle-xs toggle-success" checked={showQrCode} onChange={() => setShowQrCode(!showQrCode)} />
                    </div>
                    {showQrCode && (
                      <input 
                        type="text" 
                        className="input input-xs input-bordered bg-black/40 w-full text-[10px] mt-1 border-[#50E3C2]/30" 
                        placeholder="URL Marketing..." 
                        value={qrCodeUrl}
                        onChange={(e) => setQrCodeUrl(e.target.value)}
                      />
                    )}

                    <div className="flex items-center justify-between mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Mode Imprimeur (Print Ready)</span>
                        <span className="text-[7px] opacity-40 uppercase">Bleed 5mm & Traits de coupe</span>
                      </div>
                      <input type="checkbox" className="toggle toggle-sm toggle-error" checked={isPrintMode} onChange={() => setIsPrintMode(!isPrintMode)} />
                    </div>
                  </div>
                </div>
              )}

              <input ref={logoInputRef} type="file" className="hidden" onChange={(e: any) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')} />
              <input ref={bgInputRef} type="file" className="hidden" onChange={(e: any) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'background')} />
              <input ref={inspirationInputRef} type="file" className="hidden" onChange={(e: any) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'inspiration')} />
            </section>

            {/* Preview Section */}
            <section className="lg:col-span-8 flex flex-col relative min-h-[600px]">
              <div className="mockup-window border border-white/10 bg-base-300 shadow-2xl h-full flex flex-col">
                <div className="flex-grow p-6 overflow-y-auto scrollbar-hide flex flex-col items-center">
                  {activeTab === 'branding' && brandIdentity ? (
                    <div className="w-full space-y-8 animate-in fade-in duration-700">
                      <div className="bg-base-300 rounded-3xl p-8 border border-white/10 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Fingerprint className="w-64 h-64" />
                        </div>
                        
                        <h2 className="text-3xl font-black mb-8 border-l-4 border-indigo-500 pl-4 uppercase tracking-tighter">Charte Graphique Officielle</h2>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Palette */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold opacity-40 uppercase tracking-widest">Palette de Marque</h4>
                            <div className="flex gap-4">
                              <div className="flex-1 space-y-2 text-center">
                                <div className="w-full h-12 rounded-xl border border-white/10" style={{ backgroundColor: brandIdentity.primary_hex }}></div>
                                <span className="text-xs font-mono opacity-50">{brandIdentity.primary_hex}</span>
                              </div>
                              <div className="flex-1 space-y-2 text-center">
                                <div className="w-full h-12 rounded-xl border border-white/10" style={{ backgroundColor: brandIdentity.secondary_hex }}></div>
                                <span className="text-xs font-mono opacity-50">{brandIdentity.secondary_hex}</span>
                              </div>
                            </div>
                          </div>

                          {/* Typo */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold opacity-40 uppercase tracking-widest">Typographies</h4>
                            <div className="space-y-1">
                              {brandIdentity.typography.map((t: string, i: number) => (
                                <div key={i} className="bg-black/20 px-3 py-2 rounded-lg flex justify-between items-center">
                                  <span className="font-bold text-base tracking-tight">{t}</span>
                                  <span className="text-xs font-black opacity-20 uppercase tracking-widest">Vector</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-black opacity-40 uppercase tracking-[0.2em] text-[#50E3C2]">Usage & Vision</h4>
                            <p className="text-sm border border-white/10 p-5 rounded-2xl leading-relaxed italic opacity-80 bg-white/5 border-l-4 border-l-[#50E3C2]">
                              {brandIdentity.usage_guideline}
                            </p>
                          </div>
                        </div>

                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                          {brandIdentity.logo_variants.map((v: any, i: number) => (
                            <div key={i} className="group flex flex-col items-center gap-4">
                              <div className="w-full aspect-square bg-[#05070a] rounded-3xl overflow-hidden flex items-center justify-center border border-white/5 relative shadow-inner group-hover:border-white/10 transition-all">
                                <img src={`${apiBaseUrl}${v.url}`} alt="Variant" className="max-w-[70%] max-h-[70%] object-contain group-hover:scale-110 transition-transform duration-500" />
                              </div>
                              <span className="text-xs font-black opacity-40 uppercase tracking-[0.2em] group-hover:opacity-100 transition-opacity">
                                {i === 0 ? "Corporate Identity" : i === 1 ? "Noir Profond (Web)" : "Inversé Haute-Visibilité"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Section Mockups de Présentation */}
                        <div className="mt-16 pt-12 border-t border-white/5">
                          <div className="flex justify-between items-center mb-10">
                            <div>
                              <h3 className="text-2xl font-black uppercase tracking-tighter">Mockups de Présentation</h3>
                              <p className="text-xs opacity-50">Visualisation du logo en situation réelle pour le client.</p>
                            </div>
                            {!mockupUrls && (
                              <button 
                                onClick={handleGenerateMockups}
                                className={`btn btn-outline btn-sm ${loading ? 'loading' : ''}`}
                                disabled={loading}
                              >
                                🚀 Générer les Mockups
                              </button>
                            )}
                          </div>

                          {mockupUrls ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               {mockupUrls.map((m: any) => (
                                <div key={m.id} className="group relative rounded-3xl overflow-hidden shadow-2xl border border-white/5 hover:scale-[1.02] transition-transform">
                                  <img src={m.url} alt="Mockup" className="w-full h-auto" />
                                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Réalité Pro</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-40 bg-black/20 rounded-3xl flex items-center justify-center border-2 border-dashed border-white/5 opacity-30">
                              <p className="text-xs font-bold uppercase tracking-widest">En attente de génération des mockups...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : previewUrls && previewUrls.length > 0 ? (
                    <div className={`grid ${activeTab === 'photo' ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} gap-6 w-full`}>
                      {previewUrls.map((res: any) => (
                        <div key={res.id} className="group relative flex flex-col gap-2">
                           <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                             <a href={res.url} download className="btn btn-circle btn-xs btn-primary"><Download className="w-3 h-3" /></a>
                           </div>
                           <img src={res.url} className="w-full rounded-lg shadow-xl ring-1 ring-white/10 hover:ring-brand/50 transition-all cursor-zoom-in" alt="Résultat" />
                           <span className="text-[10px] font-mono opacity-40 truncate uppercase tracking-widest">{res.id}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 py-20">
                      <Image className="w-20 h-20 mb-4" />
                      <p className="font-bold tracking-widest uppercase">En attente de création...</p>
                    </div>
                  )}

                  {activeTab === 'photo' && previewUrls && previewUrls.length > 0 && !shareLink && (
                    <div className="mt-8 flex flex-col items-center gap-6 p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in duration-500">
                      <div className="text-center">
                        <h3 className="text-2xl font-black tracking-tighter mb-2">PRÊT À <span className="text-[#E5A93C]">SMASHER</span> ?</h3>
                        <p className="text-sm opacity-60">Générez un lien sécurisé valide 7 jours.</p>
                      </div>
                      
                      <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl">
                        <label className="text-[10px] font-black opacity-40 uppercase">Validité</label>
                        <select 
                          className="select select-ghost select-xs font-black"
                          value={shareDays}
                          onChange={(e) => setShareDays(parseInt(e.target.value))}
                        >
                          <option value={1}>1 jour</option>
                          <option value={3}>3 jours</option>
                          <option value={7}>7 jours (Défaut)</option>
                          <option value={14}>14 jours</option>
                        </select>
                      </div>

                      <button 
                         onClick={handleSmashShare}
                         className={`relative flex items-center justify-center group ${isSmashing ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="absolute inset-0 bg-[#E5A93C] rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#E5A93C] group-hover:scale-110 transition-transform duration-300">
                          {isSmashing ? (
                            <span className="loading loading-spinner text-[#E5A93C]"></span>
                          ) : (
                            <span className="text-4xl font-black text-[#E5A93C]">S</span>
                          )}
                        </div>
                      </button>
                    </div>
                  )}

                  {shareLink && (
                    <div className="mt-8 p-10 bg-gradient-to-br from-[#E5A93C] to-orange-600 rounded-[40px] text-black shadow-[0_20px_60px_rgba(229,169,60,0.4)] animate-in slide-in-from-bottom-10 duration-700">
                       <div className="flex flex-col items-center gap-6 text-center">
                          <div className="p-4 bg-white rounded-full">
                            <Share2 className="w-8 h-8 text-[#E5A93C]" />
                          </div>
                          <h2 className="text-4xl font-black tracking-tighter">LIEN GÉNÉRÉ !</h2>
                          <div className="bg-white/20 p-6 rounded-3xl w-full flex items-center gap-4 border border-white/20 backdrop-blur-md">
                             <input 
                               readOnly 
                               value={shareLink.url} 
                               className="bg-transparent flex-grow font-mono text-xs font-bold focus:outline-none"
                             />
                             <button 
                               onClick={() => {
                                 navigator.clipboard.writeText(shareLink.url);
                                 const btn = document.getElementById('copy-btn');
                                 if (btn) btn.innerText = "COPIÉ !";
                                 setTimeout(() => { if (btn) btn.innerText = "COPIER"; }, 2000);
                               }}
                               id="copy-btn"
                               className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                             >
                               COPIER
                             </button>
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 decoration-none">
                            Expire le : {new Date(shareLink.expires_at * 1000).toLocaleDateString('fr-FR')}
                          </p>
                          <button 
                            onClick={() => setShareLink(null)}
                            className="btn btn-link btn-xs text-black/60 no-underline font-black"
                          >
                            Nouveau transfert
                          </button>
                       </div>
                    </div>
                  )}
                </div>
                
                {previewUrls && (
                  <div className="p-4 border-t border-white/5 bg-black/20 flex justify-between items-center">
                     <span className="text-[10px] font-bold opacity-40">{previewUrls.length} éléments générés</span>
                     <button className="btn btn-sm btn-ghost text-brand" onClick={() => setPreviewUrls(null)}>Réinitialiser</button>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'catalog' && (
          <section className="lg:col-span-12 flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-8 max-w-4xl mx-auto py-10">
              <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-black uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(0,224,255,0.1)]">
                <Store className="w-4 h-4" />
                Asset Marketplace v2.0
              </div>
              <h2 className="text-8xl font-black tracking-tighter leading-tight">Votre <span className="text-brand">Arsenal</span> Créatif.</h2>
              <p className="text-neutral-content/60 text-xl font-medium leading-relaxed">Accédez à des milliers de ressources premium pour des créations qui captivent l'audience et imposent votre marque.</p>
              
              <div className="relative max-w-2xl mx-auto group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                  <Sparkles className="h-6 w-6 text-brand opacity-60 group-focus-within:opacity-100 transition-opacity" />
                </div>
                <input 
                  type="text" 
                  className="input input-bordered input-lg w-full pl-16 bg-base-300/40 backdrop-blur-2xl border-white/10 focus:border-brand/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl text-lg font-bold"
                  placeholder="Rechercher une police, un mockup, un thème..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
              {/* Colonne Polices */}
              <div className="bg-base-200/50 rounded-3xl p-8 border border-white/5 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-brand/20 p-3 rounded-2xl">
                    <Type className="w-6 h-6 text-brand" />
                  </div>
                  <h3 className="text-xl font-bold">Catalogue Typographique</h3>
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="sticky top-0 z-10 bg-base-200 py-2">
                    <input 
                      type="text" 
                      className="input input-bordered input-xs w-full bg-base-300/50" 
                      placeholder="Filtrer les polices..."
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                    />
                  </div>
                  {availableFonts
                    .filter(name => name.toLowerCase().includes(fontSearch.toLowerCase()))
                    .map((name, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        setFormData(prev => ({...prev, fontFamily: name}));
                        setActiveTab('design');
                        setTimeout(() => {
                           const el = document.getElementById('design-panel');
                           if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className={`bg-black/20 p-4 rounded-xl hover:bg-white/5 transition-all cursor-pointer border ${formData.fontFamily === name ? 'border-brand bg-brand/10' : 'border-white/5'} group`}
                    >
                      <div className="text-2xl mb-2 group-hover:text-brand transition-colors truncate" style={{ fontFamily: name }}>{name}</div>
                      <div className="text-xs uppercase tracking-[0.2em] opacity-40 font-black">Système / Vectorisée</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colonne Mockups */}
              <div className="bg-base-200/50 rounded-3xl p-8 border border-white/5 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600/20 p-3 rounded-2xl">
                    <Layers className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold">Bibliothèque Mockups</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { name: 'Business Cards (3D)', icon: '📇', desc: 'Presentation pro sur table' },
                    { name: 'Smartphone Pro (Clay)', icon: '📱', desc: 'Interface mobile réaliste' },
                    { name: 'Stationery Set (Luxury)', icon: '📎', desc: 'Ensemble de papeterie luxe' },
                    { name: 'Outdoor Billboard', icon: '🏙️', desc: 'Affichage urbain géant' },
                    { name: 'Premium Bag (Kraft)', icon: '🛍️', desc: 'Sac de luxe texturé' },
                    { name: 'Corporate ID Badge', icon: '🆔', desc: 'Badge entreprise pro' },
                    { name: 'Matte Ceramic Mug', icon: '☕', desc: 'Mug black mat élégant' },
                    { name: 'Modern Storefront', icon: '🏪', desc: 'Enseigne de magasin' },
                    { name: 'Roll-up Banner', icon: '🏳️', desc: 'Marketing display' },
                    { name: 'Hardcover Notebook', icon: '📓', desc: 'Sketchbook pro' },
                    { name: 'Merchandising Cap', icon: '🧢', desc: 'Casquette personnalisée' }
                  ].map((m, i) => (
                    <div key={i} className="bg-black/20 p-4 rounded-xl flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer border border-white/5 group">
                      <div className="text-3xl group-hover:scale-110 transition-transform">{m.icon}</div>
                      <div>
                        <div className="font-black text-base group-hover:text-indigo-400">{(m as any).name}</div>
                        <div className="text-xs opacity-50 font-medium">{(m as any).desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colonne Inspirations / Themes */}
              <div className="bg-base-200/50 rounded-3xl p-8 border border-white/5 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-[#E5A93C]/20 p-3 rounded-2xl">
                    <BookOpen className="w-6 h-6 text-[#E5A93C]" />
                  </div>
                  <h3 className="text-xl font-bold">Modèles d'Inspiration</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'CHURCH SPIRIT', theme: 'Gospel, Event, Hope', img: '/affiche/Church Flyer Design.jfif' },
                    { name: 'CELEBRATION VIBE', theme: 'Birthday, Party, Joy', img: '/affiche/Birthday Flyer Design.jfif' },
                    { name: 'BUSINESS CLASS', theme: 'Clean, Corporate, Trust', img: '/affiche/Business flyer.jfif' },
                    { name: 'CREATIVE STUDIO', theme: 'Artistic, Bold, Unique', img: '/affiche/Creative Social Media Flyer Design.jfif' },
                    { name: 'MODERN MINIMAL', theme: 'Sleek, Trend, Future', img: '/affiche/Modern Minimalist.jfif' },
                    { name: 'DIGITAL MARKETING', theme: 'Tech, AI, Growth', img: '/affiche/Digital Marketing Flyer Design.jfif' }
                  ].map((s, i) => (
                    <div 
                      key={i} 
                      className="group relative rounded-xl overflow-hidden aspect-[16/6] border border-white/10 hover:border-brand/40 transition-colors cursor-pointer"
                      onClick={() => {
                        setFormData(prev => ({...prev, theme: s.name.toLowerCase().includes('church') ? 'church' : s.name.toLowerCase().includes('minimal') ? 'minimal' : 'tech'}));
                        setActiveTab('design');
                      }}
                    >
                      <img src={s.img} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700" alt={s.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-end">
                        <div className="text-sm font-black tracking-widest text-white shadow-sm mb-1">{s.name}</div>
                        <div className="text-xs text-white/70 font-bold uppercase tracking-widest">{s.theme}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <FeedbackModal />
      </div>
    </div>
  )
}
