// app/api/guilds/[guildId]/config/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth"; // authOptions'ı içe aktar
import { getDb } from "../../../../lib/mongodb"; // MongoDB bağlantı yardımcı fonksiyonunu içe aktar
import { ObjectId } from "mongodb"; // ObjectId tipini içe aktar

// Belirli bir sunucunun bot yapılandırmasını almak için GET isteği işleyicisi
export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    console.log("API: /api/guilds/[guildId]/config - Session:", session); // DEBUG LOG
    console.log("API: /api/guilds/[guildId]/config - Access Token:", session?.accessToken); // DEBUG LOG

    if (!session || !session.accessToken) {
      return new Response(JSON.stringify({ message: "Yetkisiz" }), { status: 401 });
    }

    const { guildId } = params;
    const db = await getDb();
    const guildConfigsCollection = db.collection('guild_configs');

    // Sunucu yapılandırmasını MongoDB'den al
    const guildConfig = await guildConfigsCollection.findOne({ guildId });

    if (!guildConfig) {
      // Yapılandırma bulunamazsa varsayılan boş bir yapılandırma döndür
      return new Response(JSON.stringify({ guildId, configurableRoleIds: [], roleEmojiMappings: {}, faceitLevelRoles: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(guildConfig), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`Guild ${params.guildId} için yapılandırma alınırken hata:`, error);
    return new Response(JSON.stringify({ message: "Sunucu tarafı hatası." }), { status: 500 });
  }
}

// Belirli bir sunucunun bot yapılandırmasını güncellemek için PUT isteği işleyicisi
export async function PUT(request: Request, { params }: { params: { guildId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return new Response(JSON.stringify({ message: "Yetkisiz" }), { status: 401 });
    }

    const { guildId } = params;
    const db = await getDb();
    const guildConfigsCollection = db.collection('guild_configs');

    const body = await request.json();
    // Gelen veriyi doğrula ve sadece izin verilen alanları güncelle
    const { configurableRoleIds, roleEmojiMappings, faceitLevelRoles } = body;

    const updateDoc: any = { guildId }; // guildId'yi set et

    if (Array.isArray(configurableRoleIds)) {
      updateDoc.configurableRoleIds = configurableRoleIds;
    }
    if (typeof roleEmojiMappings === 'object' && roleEmojiMappings !== null) {
      updateDoc.roleEmojiMappings = roleEmojiMappings;
    }
    if (typeof faceitLevelRoles === 'object' && faceitLevelRoles !== null) {
      updateDoc.faceitLevelRoles = faceitLevelRoles;
    }

    // Upsert: Belge yoksa oluştur, varsa güncelle
    const result = await guildConfigsCollection.updateOne(
      { guildId },
      { $set: updateDoc },
      { upsert: true }
    );

    return new Response(JSON.stringify({ message: "Yapılandırma başarıyla güncellendi.", result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`Guild ${params.guildId} için yapılandırma güncellenirken hata:`, error);
    return new Response(JSON.stringify({ message: "Sunucu tarafı hatası." }), { status: 500 });
  }
}
