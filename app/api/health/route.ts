// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';

let cachedClient: MongoClient | null = null;

async function checkDatabase() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) return { status: 'error', message: 'MongoDB URI not configured' };

    if (!cachedClient) {
      cachedClient = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      });
      await cachedClient.connect();
    }

    // Ping the database
    await cachedClient.db().admin().ping();
    return { status: 'ok', message: 'Database connected' };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { status: 'error', message: 'Database connection failed' };
  }
}

export async function GET() {
  const startTime = Date.now();

  try {
    // Check environment variables
    const requiredEnvVars = [
      'DISCORD_CLIENT_ID',
      'DISCORD_CLIENT_SECRET',
      'BOT_TOKEN',
      'NEXTAUTH_SECRET',
      'MONGO_URI'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      return NextResponse.json({
        status: 'error',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: Date.now() - startTime
      }, { status: 500 });
    }

    // Check database connection
    const dbHealth = await checkDatabase();

    const healthData = {
      status: dbHealth.status === 'ok' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      services: {
        discord: {
          status: 'ok',
          clientId: process.env.DISCORD_CLIENT_ID ? 'configured' : 'missing'
        },
        faceit: {
          status: process.env.FACEIT_API_KEY ? 'configured' : 'missing'
        },
        nextauth: {
          status: process.env.NEXTAUTH_SECRET ? 'configured' : 'missing'
        }
      }
    };

    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthData, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
