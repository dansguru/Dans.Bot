/**
 * Simple notification interface
 */
export interface NotificationMessage {
  key: string;
  header: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_disposable?: boolean;
}

/**
 * Shows a notification message
 * @param message - The message to display
 * @param type - The type of notification (info, success, warning, error)
 * @returns A notification message object
 */
export const showNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): NotificationMessage => {
  return {
    key: `notification_${Date.now()}`,
    header: message,
    type,
    is_disposable: true,
  };
}; 