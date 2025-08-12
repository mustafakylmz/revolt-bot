// app/api/deploy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DeploymentPayload {
  ref: string;
  sha: string;
  repository: string;
  image: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const deployToken = process.env.DEPLOY_TOKEN;

    if (!authHeader || !deployToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== deployToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const payload: DeploymentPayload = await request.json();
    
    console.log('Deployment webhook received:', payload);

    // Validate payload
    if (!payload.ref || !payload.sha || !payload.repository || !payload.image) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Only deploy main branch
    if (payload.ref !== 'refs/heads/main') {
      return NextResponse.json({ 
        message: 'Deployment skipped - not main branch',
        ref: payload.ref 
      });
    }

    const deploymentId = `deploy-${Date.now()}`;
    
    // Log deployment start
    console.log(`Starting deployment ${deploymentId} for ${payload.repository}@${payload.sha}`);

    // Execute deployment script
    try {
      const deployScript = process.env.DEPLOY_SCRIPT || './scripts/deploy.sh';
      const { stdout, stderr } = await execAsync(`${deployScript} "${payload.image}" "${payload.sha}"`, {
        timeout: 300000, // 5 minutes timeout
        env: {
          ...process.env,
          DEPLOYMENT_ID: deploymentId,
          DOCKER_IMAGE: payload.image,
          GIT_SHA: payload.sha,
          REPOSITORY: payload.repository
        }
      });

      console.log('Deployment stdout:', stdout);
      if (stderr) console.log('Deployment stderr:', stderr);

      return NextResponse.json({
        success: true,
        deploymentId,
        message: 'Deployment completed successfully',
        image: payload.image,
        sha: payload.sha,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Deployment failed:', error);
      
      return NextResponse.json({
        success: false,
        deploymentId,
        error: 'Deployment failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json({
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Health check for deployment endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Deployment webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
}
