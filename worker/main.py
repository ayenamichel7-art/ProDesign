import os
import time
import json
import redis
import cv2
import numpy as np
from PIL import Image, ImageEnhance
from rembg import remove
redis_url = os.getenv('REDIS_URL', 'redis://redis:6379')

print("🚀 Moteur de Traitement d'Image PRO (Lightroom-inspired) démarré...", flush=True)

def apply_resize(img, target_size):
    h, w = img.shape[:2]
    if target_size in ["original", "tel_quel", ""]:
        return img
        
    aspect = None
    if target_size == "1x1":
        aspect = 1.0
    elif target_size == "4x5":
        aspect = 4.0 / 5.0
    elif target_size == "8.5x11":
        aspect = 8.5 / 11.0
    elif target_size == "5x7":
        aspect = 5.0 / 7.0
    elif target_size == "2x3":
        aspect = 2.0 / 3.0
    elif target_size == "4x3":
        aspect = 4.0 / 3.0
    elif target_size == "16x9":
        aspect = 16.0 / 9.0
    elif target_size == "16x10":
        aspect = 16.0 / 10.0
        
    if aspect:
        img_aspect = w / h
        if img_aspect > aspect:
            # Image is wider, crop width
            new_w = int(h * aspect)
            start_x = (w - new_w) // 2
            img = img[:, start_x:start_x+new_w]
        else:
            # Image is taller, crop height
            new_h = int(w / aspect)
            start_y = (h - new_h) // 2
            img = img[start_y:start_y+new_h, :]
            
    # Resize to absolute dimensions if requested (e.g., 1920x1080)
    sizes = {
        "4x3": (1024, 768),
        "16x9": (1920, 1080),
        "16x10": (1280, 800)
    }
    if target_size in sizes:
        img = cv2.resize(img, sizes[target_size], interpolation=cv2.INTER_LANCZOS4)
        
    return img

def apply_pro_effects(image_path, output_path, config):
    print(f"🎨 Traitement pro (Ultra-Def) sur {image_path}...", flush=True)
    try:
        img_cv = cv2.imread(image_path)
        if img_cv is None:
            img_pil = Image.open(image_path).convert('RGB')
            img_cv = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

        # 0. Redimensionnement / Recadrage Intelligent
        target_size = config.get("target_size", "4x5")
        img_cv = apply_resize(img_cv, target_size)

        # 1. Correction d'Exposition Dynamique (CLAHE) - Magique pour les photos mal prises
        # Divise l'image en petites tuiles et égalise l'histogramme pour révéler les détails cachés
        lab = cv2.cvtColor(img_cv, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Clip limit élevé pour la "restauration"
        clip_limit = 2.5 if config.get("restoration", False) else 1.8
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8,8))
        l = clahe.apply(l)
        
        lab = cv2.merge((l, a, b))
        img_cv = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        # 2. Balance des Blancs Automatique (Simple Gray World)
        if config.get("auto_wb", True):
            avg_a = np.average(a)
            avg_b = np.average(b)
            a = cv2.add(a, int(128 - avg_a))
            b = cv2.add(b, int(128 - avg_b))
            lab = cv2.merge((l, a, b))
            img_cv = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        # 3. Réduction de Bruit Bilatérale (Préserve les visages et les bords)
        if config.get("denoise", True):
            # Le bilatéral est lent mais donne un rendu studio
            img_cv = cv2.bilateralFilter(img_cv, 9, 75, 75)
            # Un petit coup de fastNlMeans pour le grain résiduel
            img_cv = cv2.fastNlMeansDenoisingColored(img_cv, None, 3, 3, 7, 21)

        # 4. Netteté Avancée (Multi-scale Sharpening)
        if config.get("sharpen", True):
            # On booste les détails sans créer d'artefacts
            gaussian_3 = cv2.GaussianBlur(img_cv, (0, 0), 1)
            img_cv = cv2.addWeighted(img_cv, 1.5, gaussian_3, -0.5, 0)
            
            if config.get("restoration", False):
                # Pour les vieilles photos, on accentue encore plus les bords
                kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
                img_cv = cv2.filter2D(img_cv, -1, kernel)

        # 5. Correction Gamma (Luminosité non-linéaire)
        gamma = config.get("gamma", 1.1)
        if gamma != 1.0:
            invGamma = 1.0 / gamma
            table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
            img_cv = cv2.LUT(img_cv, table)

        # Conversion PIL pour les touches finales de couleur
        img_pil = Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))
        
        # Boost Couleur Intelligent (Vibrance)
        saturation = config.get("saturation", 1.25)
        if saturation != 1.0:
            img_pil = ImageEnhance.Color(img_pil).enhance(saturation)
            
        # Contraste final
        contrast = config.get("contrast", 1.15)
        img_pil = ImageEnhance.Contrast(img_pil).enhance(contrast)

        # Sauvegarde Haute Qualité
        img_pil.save(output_path, quality=98, subsampling=0)
        print(f"✅ Image ULTRA-PRO prête: {output_path}", flush=True)
        return True
    except Exception as e:
        print(f"❌ Erreur processing Pro Photo: {e}", flush=True)
        return False

def apply_remove_bg(image_path, output_path):
    print(f"✂️ Détourage AI (Rembg) sur {image_path}...", flush=True)
    try:
        input_image = Image.open(image_path)
        output_image = remove(input_image)
        output_image.save(output_path, format="PNG", quality=100)
        print(f"✅ Détourage réussi: {output_path}", flush=True)
        return True
    except Exception as e:
        print(f"❌ Erreur de détourage: {e}", flush=True)
        return False

def main():
    try:
        r = redis.Redis.from_url(redis_url)
        print("🔗 Connecté à Redis Image Queue", flush=True)
    except Exception as e:
        print(f"❌ Impossible de se connecter à Redis: {e}", flush=True)
        return
    
    while True:
        try:
            job = r.blpop('image_processing_queue', timeout=5)
            if job:
                _, data = job
                payload = json.loads(data)
                
                input_file = payload.get('input')
                output_file = payload.get('output')
                config = payload.get('config', {})
                job_type = payload.get('job_type', 'photo_studio')
                
                # Check if input exists
                if os.path.exists(input_file):
                    if job_type == 'remove_bg':
                        apply_remove_bg(input_file, output_file)
                    else:
                        apply_pro_effects(input_file, output_file, config)
                else:
                    print(f"⚠️ Fichier source introuvable: {input_file}", flush=True)
                
        except Exception as e:
            # Silence redis timeout errors
            if "timeout" not in str(e).lower():
                print(f"⚠️ Worker Loop Info: {e}", flush=True)
            time.sleep(1)

if __name__ == '__main__':
    main()
