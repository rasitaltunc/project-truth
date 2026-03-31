/**
 * GCP Bağlantı Testi
 * Kullanım: node scripts/test-gcp.js
 *
 * Bu script .env.local'dan credentials okur ve GCS + Document AI + Vision AI bağlantısını test eder.
 */

const fs = require('fs');
const path = require('path');

// .env.local'dan ortam değişkenlerini oku
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

function getEnv(key) {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

const serviceAccountKey = getEnv('GCP_SERVICE_ACCOUNT_KEY');
const projectId = getEnv('GCP_PROJECT_ID');
const region = getEnv('GCP_REGION');
const bucketName = getEnv('GCS_BUCKET_NAME');
const processorId = getEnv('GCP_DOCUMENT_AI_PROCESSOR_ID');

if (!serviceAccountKey) {
  console.error('❌ GCP_SERVICE_ACCOUNT_KEY bulunamadı .env.local dosyasında');
  process.exit(1);
}

const creds = JSON.parse(serviceAccountKey);

console.log('═══════════════════════════════════════════');
console.log('  PROJECT TRUTH — GCP Bağlantı Testi');
console.log('═══════════════════════════════════════════');
console.log(`  Project:   ${projectId}`);
console.log(`  Region:    ${region}`);
console.log(`  Bucket:    ${bucketName}`);
console.log(`  Processor: ${processorId}`);
console.log(`  SA Email:  ${creds.client_email}`);
console.log('═══════════════════════════════════════════\n');

async function testGCS() {
  console.log('── 1. Google Cloud Storage ──');
  try {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage({ credentials: creds, projectId: creds.project_id });

    // Bucket var mı?
    const [exists] = await storage.bucket(bucketName).exists();
    if (!exists) {
      console.log(`  ⚠️  Bucket "${bucketName}" YOK — oluşturuluyor...`);
      await storage.createBucket(bucketName, { location: region.toUpperCase() });
      console.log(`  ✅ Bucket oluşturuldu: ${bucketName}`);
    } else {
      console.log(`  ✅ Bucket mevcut: ${bucketName}`);
    }

    // Test upload
    const testData = Buffer.from('Truth Platform GCS Test — ' + new Date().toISOString());
    await storage.bucket(bucketName).file('_test/connection-test.txt').save(testData);
    console.log('  ✅ Upload çalışıyor');

    // Test download
    const [downloaded] = await storage.bucket(bucketName).file('_test/connection-test.txt').download();
    console.log('  ✅ Download çalışıyor (' + downloaded.length + ' bytes)');

    // Cleanup
    await storage.bucket(bucketName).file('_test/connection-test.txt').delete();
    console.log('  ✅ Delete çalışıyor (test dosyası silindi)\n');
    return true;
  } catch (e) {
    console.error('  ❌ GCS Hatası:', e.message, '\n');
    return false;
  }
}

async function testDocumentAI() {
  console.log('── 2. Document AI (OCR) ──');
  try {
    const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
    const apiEndpoint = `${region}-documentai.googleapis.com`;
    const client = new DocumentProcessorServiceClient({ credentials: creds, apiEndpoint });

    const processorName = `projects/${projectId}/locations/${region}/processors/${processorId}`;
    console.log(`  Processor: ${processorName}`);
    console.log(`  Endpoint:  ${apiEndpoint}`);

    // Test OCR: basit bir metin görseli oluştur (1x1 beyaz PNG)
    // Gerçek test için bir PDF gönder
    const testPdf = Buffer.from(
      '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n' +
      'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
      'trailer<</Size 4/Root 1 0 R>>\nstartxref\n206\n%%EOF'
    );

    const [result] = await client.processDocument({
      name: processorName,
      rawDocument: {
        content: testPdf.toString('base64'),
        mimeType: 'application/pdf',
      },
    });

    console.log('  ✅ Document AI bağlantısı çalışıyor');
    console.log(`  📄 Test sonucu: "${(result.document?.text || '(boş)').trim()}" (${result.document?.pages?.length || 0} sayfa)\n`);
    return true;
  } catch (e) {
    console.error('  ❌ Document AI Hatası:', e.message);
    if (e.message.includes('PERMISSION_DENIED')) {
      console.error('  💡 Service account\'a "Document AI Editor" rolü ver');
    }
    if (e.message.includes('NOT_FOUND')) {
      console.error('  💡 Processor ID\'yi kontrol et: ' + processorId);
    }
    console.log('');
    return false;
  }
}

async function testVisionAI() {
  console.log('── 3. Vision AI ──');
  try {
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient({ credentials: creds });

    // Test: 1x1 kırmızı PNG
    const redPixelPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    const [result] = await client.labelDetection({ image: { content: redPixelPng } });
    const labels = result.labelAnnotations || [];

    console.log('  ✅ Vision AI bağlantısı çalışıyor');
    console.log(`  🏷️  Test sonucu: ${labels.length} etiket bulundu`);
    if (labels.length > 0) {
      console.log(`     İlk etiket: "${labels[0].description}" (${Math.round((labels[0].score || 0) * 100)}%)`);
    }
    console.log('');
    return true;
  } catch (e) {
    console.error('  ❌ Vision AI Hatası:', e.message);
    if (e.message.includes('PERMISSION_DENIED')) {
      console.error('  💡 Service account\'a "Cloud Vision API User" rolü ver');
    }
    if (e.message.includes('has not been used') || e.message.includes('is disabled')) {
      console.error('  💡 Vision API\'yi aktifleştir: GCP Console → APIs & Services → Enable');
    }
    console.log('');
    return false;
  }
}

async function main() {
  const gcs = await testGCS();
  const docai = await testDocumentAI();
  const vis = await testVisionAI();

  console.log('═══════════════════════════════════════════');
  console.log('  SONUÇ');
  console.log('═══════════════════════════════════════════');
  console.log(`  Cloud Storage:  ${gcs ? '✅ HAZIR' : '❌ SORUNLU'}`);
  console.log(`  Document AI:    ${docai ? '✅ HAZIR' : '❌ SORUNLU'}`);
  console.log(`  Vision AI:      ${vis ? '✅ HAZIR' : '❌ SORUNLU'}`);
  console.log('═══════════════════════════════════════════');

  if (gcs && docai && vis) {
    console.log('\n🎉 Tüm GCP servisleri çalışıyor! npm run dev ile test edebilirsin.\n');
  } else {
    console.log('\n⚠️  Bazı servisler sorunlu. Yukarıdaki hata mesajlarını kontrol et.\n');
  }
}

main();
