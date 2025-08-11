import axios from 'axios';

export interface SlackNotification {
  url: string;
  name: string;
  consecutiveFailures: number;
  lastError?: string;
  groupName?: string;
}

export class SlackNotifier {
  private readonly webhookUrl: string;
  private readonly enableNotifications: boolean;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.enableNotifications = !!this.webhookUrl;
    
    if (!this.enableNotifications) {
      console.log('⚠️  Slack notifications disabled - SLACK_WEBHOOK_URL not configured');
    } else {
      console.log('✅ Slack notifications enabled');
    }
  }

  async sendFailureAlert(notification: SlackNotification): Promise<void> {
    if (!this.enableNotifications) {
      console.log(`🔕 Slack notification skipped for ${notification.name} (${notification.consecutiveFailures} failures)`);
      return;
    }

    try {
      await axios.post(this.webhookUrl, {
        text: `🚨 URL Monitor Alert`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 URL Monitor Alert'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*URL:* ${notification.name}\n${notification.url}`
              },
              {
                type: 'mrkdwn',
                text: `*Group:* ${notification.groupName || 'Ungrouped'}\n*Consecutive Failures:* ${notification.consecutiveFailures}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error:* ${notification.lastError || 'Connection failed'}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `⏰ ${new Date().toLocaleString()} | 📊 <http://localhost:3000|View Dashboard>`
              }
            ]
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`📤 Slack notification sent for ${notification.name} (${notification.consecutiveFailures} consecutive failures)`);
    } catch (error) {
      console.error('❌ Failed to send Slack notification:', error);
    }
  }

  async sendRecoveryAlert(notification: SlackNotification): Promise<void> {
    if (!this.enableNotifications) {
      return;
    }

    try {
      await axios.post(this.webhookUrl, {
        text: `✅ URL Monitor Recovery`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '✅ URL Monitor Recovery'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*URL:* ${notification.name}\n${notification.url}`
              },
              {
                type: 'mrkdwn',
                text: `*Group:* ${notification.groupName || 'Ungrouped'}\n*Status:* Back Online! 🎉`
              }
            ]
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `⏰ ${new Date().toLocaleString()} | 📊 <http://localhost:3000|View Dashboard>`
              }
            ]
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`📤 Slack recovery notification sent for ${notification.name}`);
    } catch (error) {
      console.error('❌ Failed to send Slack recovery notification:', error);
    }
  }

  private formatFailureMessage(notification: SlackNotification): string {
    return `🚨 *URL Monitor Alert*
    
*URL:* ${notification.name}
*Address:* ${notification.url}
*Group:* ${notification.groupName || 'Ungrouped'}
*Consecutive Failures:* ${notification.consecutiveFailures}
*Error:* ${notification.lastError || 'Connection failed'}

⏰ ${new Date().toLocaleString()}
📊 View Dashboard: http://localhost:3000`;
  }

  isEnabled(): boolean {
    return this.enableNotifications;
  }
}
