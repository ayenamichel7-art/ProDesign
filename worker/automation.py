import os
import json
import redis
import requests
import smtplib
import logging
import subprocess
import boto3
from botocore.client import Config
from email.mime.text import MIMEText
from datetime import datetime
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("prodesign-automation")

# Configuration
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379')
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')

MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'minio:9000')
MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', '')
MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', '')
MINIO_BUCKET = os.getenv('MINIO_BUCKET', 'prodesign')

SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.example.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASS = os.getenv('SMTP_PASS', '')

# Redis connection
try:
    r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    logger.info("✅ Connected to Redis")
except Exception as e:
    logger.error(f"❌ Failed to connect to Redis: {e}")
    r = None

# S3 Client for MinIO
try:
    s3 = boto3.client(
        's3',
        endpoint_url=f"http://{MINIO_ENDPOINT}" if not MINIO_ENDPOINT.startswith('http') else MINIO_ENDPOINT,
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        config=Config(signature_version='s3v4'),
        region_name='us-east-1' # Default for MinIO
    )
    logger.info("✅ Connected to MinIO S3")
except Exception as e:
    logger.error(f"❌ Failed to connect to MinIO: {e}")
    s3 = None

def send_telegram_message(message):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning(f"📡 [SKIP] Telegram not configured. Message: {message[:80]}...")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"❌ Telegram Error: {e}")

def send_email(to_email, subject, body):
    if not SMTP_USER or not SMTP_PASS:
        logger.warning(f"📧 [SKIP] SMTP not configured. Email for {to_email} ignored.")
        return
    
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = SMTP_USER
    msg['To'] = to_email
    
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        logger.info(f"📧 Email sent to {to_email}")
    except Exception as e:
        logger.error(f"❌ SMTP Error: {e}")

def daily_report_task():
    """Generates and sends a daily activity report."""
    if not r: return
    
    logger.info("📊 Generating daily report...")
    today = datetime.now().strftime("%Y-%m-%d")
    stats = r.hgetall(f"stats:{today}")
    total_actions = r.get("stats:total_actions") or "0"
    
    report = f"📋 *PRODESIGN DAILY REPORT - {today}*\n\n"
    if stats:
        for key, val in stats.items():
            report += f"🔹 {key}: {val}\n"
    else:
        report += "No activity recorded today.\n"
    
    report += f"\n📈 *Cumulative Total Actions:* {total_actions}"
    
    send_telegram_message(report)

def minio_cleanup_task():
    """Deletes files older than 24 hours from the MinIO bucket."""
    if not s3: return
    
    logger.info(f"🧹 Starting MinIO cleanup for bucket: {MINIO_BUCKET}")
    try:
        now = datetime.now(datetime.now().astimezone().tzinfo)
        continuation_token = None
        deleted_count = 0
        
        while True:
            list_params = {'Bucket': MINIO_BUCKET}
            if continuation_token:
                list_params['ContinuationToken'] = continuation_token
            
            response = s3.list_objects_v2(**list_params)
            if 'Contents' not in response:
                break
            
            for obj in response['Contents']:
                last_modified = obj['LastModified']
                # Age in hours
                age = (now - last_modified).total_seconds() / 3600
                
                if age > 24: # Delete if older than 24 hours
                    s3.delete_object(Bucket=MINIO_BUCKET, Key=obj['Key'])
                    deleted_count += 1
            
            if not response.get('IsTruncated'):
                break
            continuation_token = response.get('NextContinuationToken')
            
        if deleted_count > 0:
            logger.info(f"✅ Cleaned up {deleted_count} old files from MinIO.")
            # Optionnel: Notifier Telegram si beaucoup de fichiers supprimés
            # send_telegram_message(f"🧹 *MinIO Cleanup:* {deleted_count} files removed.")
        else:
            logger.info("No old files to clean up in MinIO.")
            
    except Exception as e:
        logger.error(f"❌ MinIO Cleanup Error: {e}")

def vulnerability_scan_task():
    """Performs a security scan on Python dependencies using 'safety'."""
    logger.info("🔍 Running vulnerability scan...")
    report = "🛡️ *SECURITY VULNERABILITY SCAN*\n\n"
    
    try:
        # Check Python packages with safety
        # We use check --json to get structured data
        result = subprocess.run(["safety", "check", "--json"], capture_output=True, text=True)
        
        if result.returncode == 0:
            report += "✅ No known vulnerabilities detected in Python packages."
        else:
            try:
                data = json.loads(result.stdout)
                vulnerabilities = data.get('vulnerabilities', [])
                if vulnerabilities:
                    report += f"⚠️ *{len(vulnerabilities)} vulnerabilities detected!* \n"
                    for v in vulnerabilities[:5]:
                        report += f"- *{v['package_name']}*: {v['vulnerable_spec']} -> {v['advisory'][:100]}...\n"
                else:
                    report += "⚠️ 'safety' found issues but failed to parse JSON details."
            except Exception:
                report += "⚠️ Issues found. Please check manual logs. 'safety' check failed."
                
    except FileNotFoundError:
        report += "❌ 'safety' tool not installed. Run 'pip install safety' in the worker container."
    except Exception as e:
        report += f"❌ Scan Error: {str(e)}"
            
    send_telegram_message(report)

def feedback_worker():
    """Worker to process feedback queue from Redis."""
    if not r: return
    
    logger.info("💬 Feedback Worker checking for tasks...")
    # We use a non-blocking check since we are in a scheduler context or we can run this in a loop
    # Actually, for the Feedback Worker, it's better to keep it as a continuous loop in a separate thread
    # because it's a "job consumer" rather than a "scheduled task".
    while True:
        try:
            # wait up to 10 seconds for a job
            job = r.blpop('feedback_queue', timeout=10)
            if job:
                _, data = job
                payload = json.loads(data)
                email = payload.get('email')
                msg = payload.get('message')
                rating = payload.get('rating', 0)
                
                tele_msg = f"🌟 *NEW FEEDBACK RECEIVED*\n\n"
                tele_msg += f"👤 *Client:* {email}\n"
                tele_msg += f"⭐ *Rating:* {'⭐' * int(rating)}\n\n"
                tele_msg += f"💬 *Message:* {msg}"
                
                send_telegram_message(tele_msg)
                
                # Auto-reply
                send_email(
                    email, 
                    "ProDesign - Message received", 
                    "Thank you for your feedback! We have received your message and will review it shortly."
                )
        except Exception as e:
            logger.error(f"⚠️ Feedback Loop Error: {e}")
            import time
            time.sleep(5)

if __name__ == '__main__':
    scheduler = BlockingScheduler()
    
    # 1. Daily Report at 20:00
    scheduler.add_job(daily_report_task, CronTrigger(hour=20, minute=0), id="daily_report")
    
    # 2. Daily Security Scan at 02:00
    scheduler.add_job(vulnerability_scan_task, CronTrigger(hour=2, minute=0), id="security_scan")
    
    # 3. MinIO Cleanup every 6 hours
    scheduler.add_job(minio_cleanup_task, IntervalTrigger(hours=6), id="minio_cleanup")
    
    # 4. Healthcheck (Internal log) every hour
    scheduler.add_job(lambda: logger.info("💓 Automation Heartbeat"), IntervalTrigger(hours=1), id="heartbeat")

    logger.info("🚀 Starting ProDesign Automation Engine...")
    
    # Start the feedback worker in a background thread
    import threading
    threading.Thread(target=feedback_worker, daemon=True).start()
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("👋 Automation engine stopped.")
