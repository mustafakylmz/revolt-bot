// app/lib/mongodb.ts
import { MongoClient, ServerApiVersion, Db } from 'mongodb';

// MongoDB bağlantı dizisini ortam değişkenlerinden al
const uri = process.env.MONGO_URI;

if (!uri) {
  throw new Error('MONGO_URI ortam değişkeni tanımlı değil.');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;
let db: Db;

// Geliştirme ortamında global bir önbellek kullanıyoruz
// Bu, her hot-reload'da yeni bir bağlantı oluşturulmasını önler
declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

if (process.env.NODE_ENV === 'development') {
  // Geliştirme modunda, global _mongoClientPromise'ı kullan
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Üretim modunda, yeni bir MongoClient örneği oluştur
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  clientPromise = client.connect();
}

/**
 * MongoDB veritabanı örneğini döndüren yardımcı fonksiyon.
 * @returns {Promise<Db>} MongoDB veritabanı örneği.
 */
export async function getDb(): Promise<Db> {
  if (!db) {
    const connectedClient = await clientPromise;
    // URI'den veritabanı adını çıkar
    const dbName = new URL(uri!).pathname.substring(1);
    db = connectedClient.db(dbName);
  }
  return db;
}

// MongoDB istemcisini dışa aktar (gerekirse doğrudan kullanmak için)
export default clientPromise;
