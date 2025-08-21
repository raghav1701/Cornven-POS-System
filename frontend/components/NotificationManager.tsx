'use client';

import { useState, useEffect } from 'react';
import { Tenant } from '@/types/tenant';
import { notificationService, checkRentDueNotifications, checkOverdueNotifications, checkLeaseExpiryNotifications } from '@/services/notificationService';

interface NotificationManagerProps {
  tenants: Tenant[];
}

interface NotificationLog {
  id: string;
  tenantId: string;
  tenantName: string;
  type: 'rent_due' | 'rent_overdue' | 'lease_expiring' | 'payment_confirmation';
  method: 'email' | 'sms' | 'both';
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
  message: string;
}

const NotificationManager = ({ tenants }: NotificationManagerProps) => {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [notificationType, setNotificationType] = useState<'rent_due' | 'rent_overdue' | 'lease_expiring'>('rent_due');
  const [customMessage, setCustomMessage] = useState('');

  // Mock notification logs for demonstration
  useEffect(() => {
    const mockLogs: NotificationLog[] = [
      {
        id: 'log-1',
        tenantId: 'tenant-1',
        tenantName: 'Alice Smith',
        type: 'rent_due',
        method: 'both',
        status: 'sent',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        message: 'Rent payment due reminder sent'
      },
      {
        id: 'log-2',
        tenantId: 'tenant-3',
        tenantName: 'Carol Johnson',
        type: 'lease_expiring',
        method: 'email',
        status: 'sent',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        message: 'Lease expiry notification sent'
      }
    ];
    setNotifications(mockLogs);
  }, []);

  const handleSendBulkNotifications = async (type: 'due' | 'overdue' | 'expiring') => {
    setIsLoading(true);
    try {
      switch (type) {
        case 'due':
          await checkRentDueNotifications(tenants);
          break;
        case 'overdue':
          await checkOverdueNotifications(tenants);
          break;
        case 'expiring':
          await checkLeaseExpiryNotifications(tenants);
          break;
      }
      
      // Add to notification log
      const newLog: NotificationLog = {
        id: `log-${Date.now()}`,
        tenantId: 'bulk',
        tenantName: 'All Eligible Tenants',
        type: type === 'due' ? 'rent_due' : type === 'overdue' ? 'rent_overdue' : 'lease_expiring',
        method: 'both',
        status: 'sent',
        timestamp: new Date().toISOString(),
        message: `Bulk ${type} notifications sent`
      };
      
      setNotifications(prev => [newLog, ...prev]);
      alert(`Bulk ${type} notifications sent successfully!`);
    } catch (error) {
      console.error('Failed to send bulk notifications:', error);
      alert('Failed to send notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCustomNotification = async () => {
    if (!selectedTenant || !customMessage.trim()) {
      alert('Please select a tenant and enter a message');
      return;
    }

    setIsLoading(true);
    try {
      const tenant = tenants.find(t => t.id === selectedTenant);
      if (!tenant) return;

      let success = false;
      switch (notificationType) {
        case 'rent_due':
          await notificationService.sendRentDueNotification(
            tenant.email,
            tenant.phone,
            tenant.name,
            200, // Default amount
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          );
          success = true;
          break;
        case 'rent_overdue':
          await notificationService.sendOverdueNotification(
            tenant.email,
            tenant.phone,
            tenant.name,
            200,
            5 // 5 days overdue
          );
          success = true;
          break;
        case 'lease_expiring':
          await notificationService.sendLeaseExpiringNotification(
            tenant.email,
            tenant.phone,
            tenant.name,
            tenant.leaseEndDate,
            30
          );
          success = true;
          break;
      }

      if (success) {
        const newLog: NotificationLog = {
          id: `log-${Date.now()}`,
          tenantId: tenant.id,
          tenantName: tenant.name,
          type: notificationType,
          method: 'both',
          status: 'sent',
          timestamp: new Date().toISOString(),
          message: customMessage
        };
        
        setNotifications(prev => [newLog, ...prev]);
        setCustomMessage('');
        setSelectedTenant('');
        alert('Notification sent successfully!');
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'sent':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rent_due':
        return '💰';
      case 'rent_overdue':
        return '⚠️';
      case 'lease_expiring':
        return '📅';
      case 'payment_confirmation':
        return '✅';
      default:
        return '📧';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Bulk Notification Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Notifications</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => handleSendBulkNotifications('due')}
            disabled={isLoading}
            className="btn-primary flex items-center justify-center space-x-2 text-sm sm:text-base py-3"
          >
            <span>💰</span>
            <span className="hidden sm:inline">Send Rent Due Reminders</span>
            <span className="sm:hidden">Rent Due</span>
          </button>
          
          <button
            onClick={() => handleSendBulkNotifications('overdue')}
            disabled={isLoading}
            className="btn-secondary flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base py-3"
          >
            <span>⚠️</span>
            <span className="hidden sm:inline">Send Overdue Notices</span>
            <span className="sm:hidden">Overdue</span>
          </button>
          
          <button
            onClick={() => handleSendBulkNotifications('expiring')}
            disabled={isLoading}
            className="btn-secondary flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white text-sm sm:text-base py-3 sm:col-span-2 lg:col-span-1"
          >
            <span>📅</span>
            <span className="hidden sm:inline">Send Lease Expiry Alerts</span>
            <span className="sm:hidden">Lease Expiry</span>
          </button>
        </div>
      </div>

      {/* Custom Notification */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Custom Notification</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Tenant</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Choose a tenant...</option>
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} - {tenant.cubeId}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type</label>
            <select
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value as any)}
              className="input-field text-sm"
            >
              <option value="rent_due">Rent Due Reminder</option>
              <option value="rent_overdue">Overdue Notice</option>
              <option value="lease_expiring">Lease Expiry Alert</option>
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message (Optional)</label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="input-field text-sm resize-none"
            rows={3}
            placeholder="Add a custom message to include with the notification..."
          />
        </div>
        
        <button
          onClick={handleSendCustomNotification}
          disabled={isLoading || !selectedTenant}
          className="btn-primary w-full sm:w-auto text-sm sm:text-base"
        >
          Send Notification
        </button>
      </div>

      {/* Notification History */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification History</h3>
        
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm sm:text-base">No notifications sent yet</p>
        ) : (
          <div className="space-y-3 sm:hidden">
            {/* Mobile card view */}
            {notifications.map((notification) => (
              <div key={notification.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span>{getTypeIcon(notification.type)}</span>
                    <span className="text-sm font-medium capitalize">{notification.type.replace('_', ' ')}</span>
                  </div>
                  <span className={getStatusBadge(notification.status)}>
                    {notification.status}
                  </span>
                </div>
                <div className="text-sm text-gray-900 font-medium mb-1">{notification.tenantName}</div>
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(notification.timestamp).toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 line-clamp-2">{notification.message}</div>
                <div className="text-xs text-gray-500 mt-1 capitalize">via {notification.method}</div>
              </div>
            ))}
          </div>
        )}
        
        {/* Desktop table view */}
        {notifications.length > 0 && (
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Type</th>
                  <th className="table-header">Tenant</th>
                  <th className="table-header">Method</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Sent At</th>
                  <th className="table-header">Message</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <span>{getTypeIcon(notification.type)}</span>
                        <span className="capitalize">{notification.type.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">{notification.tenantName}</div>
                    </td>
                    <td className="table-cell">
                      <span className="capitalize">{notification.method}</span>
                    </td>
                    <td className="table-cell">
                      <span className={getStatusBadge(notification.status)}>
                        {notification.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      {new Date(notification.timestamp).toLocaleString()}
                    </td>
                    <td className="table-cell">
                      <div className="max-w-xs truncate" title={notification.message}>
                        {notification.message}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-sm sm:text-base">Email Notifications</h4>
              <p className="text-xs sm:text-sm text-gray-500">Send notifications via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-sm sm:text-base">SMS Notifications</h4>
              <p className="text-xs sm:text-sm text-gray-500">Send notifications via SMS</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-sm sm:text-base">Auto-send Rent Reminders</h4>
              <p className="text-xs sm:text-sm text-gray-500">Automatically send reminders 3 days before rent is due</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationManager;