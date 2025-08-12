// app/api/cron/faceit-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { MongoClient, ServerApiVersion } from 'mongodb';

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGO_URI!;
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  await client.connect();
  const dbName = new URL(uri).pathname.substring(1);
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

async function checkAndUpdateFaceitRanks(db: any) {
  console.log("Faceit ranklarını kontrol etme ve güncelleme işlemi başlatılıyor...");
  
  try {
    const faceitUsers = await db.collection('faceit_users').find({}).toArray();

    for (const user of faceitUsers) {
      const { discordId, guildId, faceitNickname, faceitLevel: storedFaceitLevel, assignedRoleId: storedAssignedRoleId } = user;
      let currentFaceitLevel = null;
      let newRoleIdToAssign = null;
      let updateNeeded = false;

      try {
        let faceitData = null;
        let faceitRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(faceitNickname)}`, {
          headers: { Authorization: `Bearer ${process.env.FACEIT_API_KEY}` }
        });

        if (faceitRes.ok) {
          faceitData = await faceitRes.json();
        } else if (faceitRes.status === 404) {
          faceitRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(faceitNickname.toLowerCase())}`, {
            headers: { Authorization: `Bearer ${process.env.FACEIT_API_KEY}` }
          });
          if (faceitRes.ok) {
            faceitData = await faceitRes.json();
          } else {
            console.warn(`Faceit nickname "${faceitNickname}" bulunamadı. Kullanıcı ${discordId} için rank kontrolü atlandı.`);
            continue;
          }
        } else {
          const errorData = await faceitRes.json();
          console.error(`Faceit API hatası (${faceitNickname}): ${errorData.message || 'Bilinmeyen hata'}. Kullanıcı ${discordId} için rank kontrolü atlandı.`);
          continue;
        }

        if (faceitData) {
          if (faceitData.games && faceitData.games.cs2) {
            currentFaceitLevel = faceitData.games.cs2.skill_level;
          } else if (faceitData.games && faceitData.games.csgo) {
            currentFaceitLevel = faceitData.games.csgo.skill_level;
          }
        }

        if (currentFaceitLevel === undefined || currentFaceitLevel === null) {
          console.warn(`Kullanıcı ${discordId} (${faceitNickname}) için CS2/CSGO seviyesi tespit edilemedi.`);
          continue;
        }

        if (currentFaceitLevel !== storedFaceitLevel) {
          updateNeeded = true;
          console.log(`Kullanıcı ${discordId} (${faceitNickname}) için rank değişti: ${storedFaceitLevel} -> ${currentFaceitLevel}`);

          const guildConfig = await db.collection('guild_configs').findOne({ guildId });
          newRoleIdToAssign = guildConfig?.faceitLevelRoles?.[String(currentFaceitLevel)] ?? null;

          if (storedAssignedRoleId && storedAssignedRoleId !== newRoleIdToAssign) {
            try {
              await rest.delete(Routes.guildMemberRole(guildId, discordId, storedAssignedRoleId));
              console.log(`Kullanıcı ${discordId} için eski rol ${storedAssignedRoleId} kaldırıldı.`);
            } catch (e) {
              console.error(`Kullanıcı ${discordId} için eski rol ${storedAssignedRoleId} kaldırılırken hata:`, e);
            }
          }

          if (newRoleIdToAssign) {
            try {
              await rest.put(Routes.guildMemberRole(guildId, discordId, newRoleIdToAssign));
              console.log(`Kullanıcı ${discordId} için yeni rol ${newRoleIdToAssign} atandı.`);
            } catch (e) {
              console.error(`Kullanıcı ${discordId} için yeni rol ${newRoleIdToAssign} atanırken hata:`, e);
            }
          } else {
            console.warn(`Faceit seviyesi ${currentFaceitLevel} için tanımlı rol bulunamadı. Kullanıcı ${discordId} için rol ataması yapılmadı.`);
          }
        }

      } catch (e) {
        console.error(`Kullanıcı ${discordId} (${faceitNickname}) için Faceit rank kontrolü sırasında hata:`, e);
        continue;
      }

      if (updateNeeded) {
        try {
          await db.collection('faceit_users').updateOne(
            { discordId, guildId },
            {
              $set: {
                faceitLevel: currentFaceitLevel,
                assignedRoleId: newRoleIdToAssign,
                lastUpdated: new Date()
              }
            }
          );
          console.log(`Kullanıcı ${discordId} veritabanında güncellendi.`);
        } catch (e) {
          console.error(`Kullanıcı ${discordId} MongoDB'ye kaydedilirken hata:`, e);
        }
      }
    }
    console.log("Faceit rank kontrolü ve güncelleme işlemi tamamlandı.");
  } catch (error) {
    console.error("Tüm Faceit kullanıcıları üzerinde işlem yapılırken hata:", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    await checkAndUpdateFaceitRanks(db);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Faceit ranks updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
