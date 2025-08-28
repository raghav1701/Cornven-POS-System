import cron from 'node-cron';
import { sendLowStockEmailsToAllTenants, getLowStockStatistics } from './lowStockEmailService';
import { checkAllTenantsForOutOfStock } from './outOfStockEmailService';

/**
 * Configuration for scheduled jobs
 */
interface ScheduledJobConfig {
  lowStockCheckEnabled: boolean;
  lowStockCheckCron: string;
  emailOnUpdate: boolean;
}

/**
 * Get configuration from environment variables
 */
function getScheduledJobConfig() {
  return {
    lowStockCheckEnabled: process.env.LOW_STOCK_SCHEDULED_ENABLED === 'true',
    lowStockCheckCron: process.env.LOW_STOCK_CHECK_CRON || '0 0 9 * * *', // Daily at 9 AM
    emailOnStockUpdate: process.env.LOW_STOCK_REALTIME_ENABLED === 'true',
  };
}

/**
 * Validate cron expression
 */
function isValidCronExpression(cronExpression: string): boolean {
  try {
    return cron.validate(cronExpression);
  } catch (error) {
    return false;
  }
}

/**
 * Daily stock checks (low stock and out-of-stock)
 */
async function runDailyStockChecks(): Promise<void> {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting daily stock checks...`);
  
  try {
    // Check for low stock items
    console.log('📊 Checking for low stock items...');
    const stats = await getLowStockStatistics();
    console.log(`Low stock statistics:`, {
      totalTenants: stats.totalTenants,
      tenantsWithLowStock: stats.tenantsWithLowStock,
      totalLowStockItems: stats.totalLowStockItems,
      criticalItems: stats.criticalItems
    });
    
    if (stats.totalLowStockItems > 0) {
      const results = await sendLowStockEmailsToAllTenants();
      console.log(`Low stock emails - Success: ${results.success}, Failed: ${results.failed}`);
    } else {
      console.log('No low stock items found.');
    }
    
    // Check for out-of-stock items
    console.log('🚨 Checking for out-of-stock items...');
    await checkAllTenantsForOutOfStock();
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`[${endTime.toISOString()}] Daily stock checks completed in ${duration}ms`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in daily stock checks:`, error);
  }
}

/**
 * Daily low stock check job (legacy function for backward compatibility)
 */
async function runDailyLowStockCheck(): Promise<void> {
  return runDailyStockChecks();
}

/**
 * Start all scheduled jobs
 */
export function startScheduledJobs(): void {
  const config = getScheduledJobConfig();
  
  console.log('Scheduled Jobs Configuration:');
    console.log(`- Low Stock Check Enabled: ${config.lowStockCheckEnabled}`);
    console.log(`- Low Stock Check Cron: ${config.lowStockCheckCron}`);
    console.log(`- Email on Update: ${config.emailOnStockUpdate}`);
  
  if (!config.lowStockCheckEnabled) {
    console.log('⚠️  Low stock checking is disabled. Set LOW_STOCK_CHECK_ENABLED=true to enable.');
    return;
  }
  
  if (!isValidCronExpression(config.lowStockCheckCron)) {
    console.error(`❌ Invalid cron expression: ${config.lowStockCheckCron}`);
    console.error('Using default cron expression: 0 9 * * * (Daily at 9 AM)');
    config.lowStockCheckCron = '0 9 * * *';
  }
  
  try {
    // Schedule daily stock checks (low stock and out-of-stock)
    const task = cron.schedule(config.lowStockCheckCron, runDailyStockChecks, {
      timezone: process.env.TZ || 'UTC'
    });
    
    console.log(`✅ Low stock check scheduled with cron: ${config.lowStockCheckCron}`);
    console.log(`   Timezone: ${process.env.TZ || 'UTC'}`);
    
    // Log next execution time
    const nextExecution = getNextExecutionTime(config.lowStockCheckCron);
    if (nextExecution) {
      console.log(`   Next execution: ${nextExecution.toISOString()}`);
    }
    
    // Optional: Run immediately for testing (only in development)
    if (process.env.NODE_ENV === 'development' && process.env.RUN_LOW_STOCK_CHECK_ON_START === 'true') {
      console.log('🔧 Development mode: Running low stock check immediately...');
      setTimeout(runDailyLowStockCheck, 5000); // Run after 5 seconds
    }
    
  } catch (error) {
    console.error('❌ Failed to start scheduled jobs:', error);
  }
}

/**
 * Stop all scheduled jobs (useful for graceful shutdown)
 */
export function stopScheduledJobs(): void {
  cron.getTasks().forEach((task, name) => {
    task.stop();
    console.log(`Stopped scheduled job: ${name}`);
  });
  console.log('All scheduled jobs stopped');
}

/**
 * Get next execution time for a cron expression
 */
function getNextExecutionTime(cronExpression: string): Date | null {
  try {
    // This is a simplified implementation
    // In a real application, you might want to use a more sophisticated cron parser
    const task = cron.schedule(cronExpression, () => {});
    // Note: node-cron doesn't provide a direct way to get next execution time
    // This is a placeholder - you might want to use a library like 'cron-parser' for this
    return new Date(Date.now() + 24 * 60 * 60 * 1000); // Approximate next day
  } catch (error) {
    return null;
  }
}

/**
 * Get current job status (for monitoring endpoints)
 */
export function getJobStatus(): {
  enabled: boolean;
  cronExpression: string;
  nextExecution: Date | null;
  tasksCount: number;
} {
  const config = getScheduledJobConfig();
  const tasks = cron.getTasks();
  
  return {
    enabled: config.lowStockCheckEnabled,
    cronExpression: config.lowStockCheckCron,
    nextExecution: getNextExecutionTime(config.lowStockCheckCron),
    tasksCount: tasks.size
  };
}

/**
 * Manual trigger for stock checks (useful for testing or admin actions)
 */
export async function triggerStockChecksManually(): Promise<{
  success: boolean;
  message: string;
  results?: any;
}> {
  try {
    console.log('Manual stock checks triggered');
    await runDailyStockChecks();
    
    return {
      success: true,
      message: 'Manual stock checks completed successfully.'
    };
  } catch (error) {
    console.error('Manual stock checks failed:', error);
    return {
      success: false,
      message: `Manual checks failed: ${error}`
    };
  }
}

/**
 * Manual trigger for low stock check (legacy function for backward compatibility)
 */
export async function triggerLowStockCheckManually(): Promise<{
  success: boolean;
  message: string;
  results?: any;
}> {
  return triggerStockChecksManually();
}

/**
 * Cron expression examples for reference
 */
export const CRON_EXAMPLES = {
  DAILY_9AM: '0 9 * * *',
  DAILY_MIDNIGHT: '0 0 * * *',
  EVERY_12_HOURS: '0 */12 * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  WEEKDAYS_9AM: '0 9 * * 1-5',
  MONDAY_9AM: '0 9 * * 1',
  FIRST_DAY_OF_MONTH: '0 9 1 * *'
};

// Export configuration getter for external use
export { getScheduledJobConfig };