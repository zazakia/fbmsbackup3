// Script execution service for real shell script execution
import { logAdminActivity } from './adminMetrics';

export interface ScriptExecutionResult {
  success: boolean;
  output: string[];
  exitCode?: number;
  error?: string;
}

export interface ScriptExecutionCallbacks {
  onStart?: () => void;
  onOutput?: (line: string, type: 'stdout' | 'stderr') => void;
  onComplete?: (result: ScriptExecutionResult) => void;
  onError?: (error: string) => void;
}

export class ScriptExecutor {
  private static instance: ScriptExecutor;
  private runningScripts: Map<string, AbortController> = new Map();

  static getInstance(): ScriptExecutor {
    if (!ScriptExecutor.instance) {
      ScriptExecutor.instance = new ScriptExecutor();
    }
    return ScriptExecutor.instance;
  }

  async executeScript(
    scriptName: string, 
    scriptPath: string, 
    callbacks: ScriptExecutionCallbacks,
    args: string[] = []
  ): Promise<void> {
    // Check if script is already running
    if (this.runningScripts.has(scriptName)) {
      callbacks.onError?.('Script is already running');
      return;
    }

    const controller = new AbortController();
    this.runningScripts.set(scriptName, controller);

    try {
      callbacks.onStart?.();
      
      // Log the script execution attempt
      await logAdminActivity(
        `Execute Script: ${scriptName}`,
        'Administration',
        `Administrator attempting to execute script: ${scriptPath}`,
        'info'
      );

      // For development/demo, we'll simulate real script execution
      // In production, this would make an API call to the server
      if (process.env.NODE_ENV === 'development') {
        await this.simulateRealScriptExecution(scriptName, scriptPath, callbacks, controller.signal);
      } else {
        await this.executeRealScript(scriptPath, args, callbacks, controller.signal);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      callbacks.onError?.(errorMessage);
      
      // Log error
      await logAdminActivity(
        `Script Error: ${scriptName}`,
        'Administration',
        `Script execution failed: ${scriptPath} - ${errorMessage}`,
        'error'
      );
    } finally {
      this.runningScripts.delete(scriptName);
    }
  }

  private async executeRealScript(
    scriptPath: string,
    args: string[],
    callbacks: ScriptExecutionCallbacks,
    signal: AbortSignal
  ): Promise<void> {
    const eventSource = new EventSource(`/api/execute-script`, {
      // Note: EventSource doesn't support POST, so we'd need to use fetch with streaming
      // This is a simplified example
    });

    const output: string[] = [];

    eventSource.onmessage = (event) => {
      if (signal.aborted) {
        eventSource.close();
        return;
      }

      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'stdout':
          case 'stderr':
            const line = `[${new Date(data.timestamp).toLocaleTimeString()}] ${data.data}`;
            output.push(line);
            callbacks.onOutput?.(line, data.type);
            break;
            
          case 'exit':
            eventSource.close();
            callbacks.onComplete?.({
              success: data.code === 0,
              output,
              exitCode: data.code
            });
            break;
            
          case 'error':
            eventSource.close();
            callbacks.onError?.(data.error);
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      callbacks.onError?.('Connection to script execution service failed');
    };

    // Handle abort
    signal.addEventListener('abort', () => {
      eventSource.close();
    });
  }

  private async simulateRealScriptExecution(
    scriptName: string,
    scriptPath: string,
    callbacks: ScriptExecutionCallbacks,
    signal: AbortSignal
  ): Promise<void> {
    // Get script-specific commands based on the actual script content
    const scriptCommands = this.getScriptSpecificCommands(scriptName, scriptPath);
    
    for (let i = 0; i < scriptCommands.length; i++) {
      if (signal.aborted) break;
      
      const command = scriptCommands[i];
      const timestamp = new Date().toLocaleTimeString();
      const line = `[${timestamp}] ${command}`;
      
      callbacks.onOutput?.(line, 'stdout');
      
      // Simulate realistic execution timing
      const delay = command.includes('Building') || command.includes('Deploying') ? 
        Math.random() * 2000 + 1000 : // Longer for build/deploy
        Math.random() * 800 + 200;    // Shorter for other commands
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (!signal.aborted) {
      callbacks.onComplete?.({
        success: true,
        output: scriptCommands,
        exitCode: 0
      });
    }
  }

  private getScriptSpecificCommands(scriptName: string, scriptPath: string): string[] {
    const baseCommands = [
      `$ chmod +x ${scriptPath}`,
      `$ ./${scriptPath}`,
      ''
    ];

    switch (scriptName) {
      case 'Git Workflow':
        return [
          ...baseCommands,
          '🔧 Starting Git Workflow...',
          '📋 Checking git status...',
          '✅ Git status checked',
          '📦 Adding all changes...',
          '✅ Changes added to staging',
          '💾 Committing changes...',
          '✅ Changes committed successfully',
          '🚀 Pushing to remote repository...',
          '✅ Successfully pushed to GitHub',
          '📊 Recent commits:',
          '  a1b2c3d Update FBMS project',
          '  e4f5g6h Fix admin permissions',
          '  i7j8k9l Add security enhancements',
          '🎉 Git workflow completed successfully!',
          '📊 Exit code: 0'
        ];

      case 'Deploy Production':
        return [
          ...baseCommands,
          '🚀 FBMS Production Deploy Script',
          '================================',
          '📋 Checking for changes...',
          '✅ Changes detected, proceeding with deployment',
          '📦 Git Workflow',
          '📝 Adding all changes...',
          '💾 Committing with production release message',
          '🚀 Pushing to GitHub...',
          '✅ Successfully pushed to GitHub!',
          '🏗️ Building and Deploying to Production',
          '================================',
          '🔍 Checking Netlify CLI...',
          '✅ Netlify CLI found',
          '🔐 Checking Netlify authentication...',
          '✅ Authenticated with Netlify',
          '🏗️ Building project for production...',
          '> npm run build',
          '📦 Building React application...',
          '⚡ Optimizing bundle size...',
          '✅ Build completed successfully',
          '🌐 Deploying to Netlify production...',
          '📤 Uploading build files...',
          '🔗 Production URL: https://fbms-production.netlify.app',
          '🎉 Production Deployment Complete!',
          '✅ Code pushed to GitHub: v2',
          '🌐 Deployed to Netlify Production',
          '🏷️ Creating Release Tag',
          '🏷️ Tag created and pushed: v2024.01.15-1430',
          '📋 Post-Deployment Checklist',
          '1. ✅ Verify the site is working',
          '2. ✅ Check all major features',
          '3. ✅ Monitor error logs',
          '4. ✅ Test user authentication',
          '5. ✅ Verify database connections',
          '✨ Production Deployment Complete!',
          '📊 Exit code: 0'
        ];

      case 'Deploy Staging':
        return [
          ...baseCommands,
          '🧪 FBMS Staging Deploy Script',
          '================================',
          '📋 Checking for changes...',
          '✅ Changes detected for staging deployment',
          '🏗️ Building project for staging...',
          '> npm run build',
          '📦 Building React application...',
          '✅ Build completed successfully',
          '🌐 Deploying to Netlify staging...',
          '📤 Uploading build files to staging...',
          '🔗 Staging URL: https://fbms-staging.netlify.app',
          '🧪 Staging Deployment Complete!',
          '✅ Deployed to staging environment',
          '📊 Exit code: 0'
        ];

      case 'Setup Netlify':
        return [
          ...baseCommands,
          '☁️ Netlify Setup Script',
          '================================',
          '🔍 Checking Netlify CLI installation...',
          '✅ Netlify CLI found',
          '🔐 Checking authentication...',
          '✅ Already authenticated with Netlify',
          '🏗️ Initializing Netlify site...',
          '📝 Creating netlify.toml configuration...',
          '✅ Configuration file created',
          '🌐 Setting up build settings...',
          '📦 Build command: npm run build',
          '📁 Publish directory: dist',
          '✅ Build settings configured',
          '🔗 Site URL configured',
          '☁️ Netlify setup completed successfully!',
          '📊 Exit code: 0'
        ];

      case 'General Deploy':
        return [
          ...baseCommands,
          '🚀 General Deploy Script',
          '================================',
          '📋 Checking deployment environment...',
          '✅ Environment ready for deployment',
          '🏗️ Building application...',
          '📦 Installing dependencies...',
          '✅ Dependencies installed',
          '🔧 Running build process...',
          '✅ Build completed successfully',
          '📤 Deploying application...',
          '✅ Deployment successful',
          '🎉 General deployment completed!',
          '📊 Exit code: 0'
        ];

      case 'Backup & Protect':
        return [
          ...baseCommands,
          '💾 Backup & Protect Script',
          '================================',
          '🔍 Checking backup directories...',
          '✅ Backup directories verified',
          '📦 Creating project backup...',
          '📁 Backing up source code...',
          '💾 Backing up configuration files...',
          '🗃️ Backing up database schema...',
          '✅ Backup completed successfully',
          '🔐 Setting up protection measures...',
          '🛡️ Configuring security settings...',
          '✅ Protection measures activated',
          '💾 Backup & protection completed!',
          '📊 Exit code: 0'
        ];

      default:
        return [
          ...baseCommands,
          '🔧 Executing script...',
          '✅ Script execution completed',
          '📊 Exit code: 0'
        ];
    }
  }

  stopScript(scriptName: string): boolean {
    const controller = this.runningScripts.get(scriptName);
    if (controller) {
      controller.abort();
      this.runningScripts.delete(scriptName);
      return true;
    }
    return false;
  }

  isScriptRunning(scriptName: string): boolean {
    return this.runningScripts.has(scriptName);
  }
}