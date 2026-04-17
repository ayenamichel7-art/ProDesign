use s3::bucket::Bucket;
use s3::creds::Credentials;
use s3::region::Region;
use anyhow::{Result, Context};

#[derive(Clone)]
pub struct S3Storage {
    bucket: Bucket,
    public_endpoint: String,
}

impl S3Storage {
    pub fn new(endpoint: &str, access_key: &str, secret_key: &str, bucket_name: &str) -> Result<Self> {
        let region = Region::Custom {
            region: "us-east-1".to_owned(),
            endpoint: format!("http://{}", endpoint),
        };
        
        let credentials = Credentials::new(Some(access_key), Some(secret_key), None, None, None)?;
        let bucket = Bucket::new(bucket_name, region.clone(), credentials.clone())
            .context("Erreur de configuration Bucket S3")?
            .with_path_style();
            
        Ok(Self { 
            bucket,
            public_endpoint: format!("http://{}/{}", endpoint, bucket_name)
        })
    }
    
    // Uploade un fichier en mémoire et retourne l'URL
    pub async fn upload_file(&self, path: &str, data: &[u8], content_type: &str) -> Result<String> {
        self.bucket.put_object_with_content_type(path, data, content_type).await?;
        Ok(format!("{}/{}", self.public_endpoint, path))
    }
}
