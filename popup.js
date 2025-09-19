// 弹窗页面管理
class PopupManager {
  constructor() {
    this.currentTheme = 'default';
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.updateUI();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['floatingNavSettings']);
      const settings = result.floatingNavSettings || {};
      this.currentTheme = settings.theme || 'default';
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  updateUI() {
    // 更新主题选择
    document.querySelectorAll('.theme-dot').forEach(dot => {
      dot.classList.remove('active');
      if (dot.dataset.theme === this.currentTheme) {
        dot.classList.add('active');
      }
    });
  }

  bindEvents() {
    // 切换导航显示/隐藏
    document.getElementById('toggle-nav').addEventListener('click', async () => {
      await this.executeAction('toggleNav');
      this.closePopup();
    });

    // 回到顶部
    document.getElementById('scroll-top').addEventListener('click', async () => {
      await this.executeAction('scrollTop');
      this.closePopup();
    });

    // 到达底部
    document.getElementById('scroll-bottom').addEventListener('click', async () => {
      await this.executeAction('scrollBottom');
      this.closePopup();
    });

    // 刷新页面
    document.getElementById('refresh-page').addEventListener('click', async () => {
      await this.executeAction('refresh');
      this.closePopup();
    });

    // 主题切换
    document.querySelectorAll('.theme-dot').forEach(dot => {
      dot.addEventListener('click', async (e) => {
        const theme = e.target.dataset.theme;
        await this.changeTheme(theme);
      });
    });

    // 打开设置页面
    document.getElementById('open-settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      this.closePopup();
    });
  }

  async executeAction(action) {
    console.log('🚀 执行操作:', action);
    
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        console.error('❌ 未找到活动标签页');
        return;
      }

      console.log('📝 当前标签页:', tab.url);

      // 检查是否为特殊页面
      if (this.isSpecialUrl(tab.url)) {
        console.log('⚠️ 当前页面不支持此操作:', tab.url);
        // 显示用户友好的提示
        this.showNotification('当前页面不支持此操作');
        return;
      }

      // 发送消息到content script
      console.log('📨 发送消息到content script:', { action });
      const response = await chrome.tabs.sendMessage(tab.id, { action: action });
      console.log('✅ 操作执行成功:', response);
      
    } catch (error) {
      console.error('❌ 执行操作失败:', error);
      
      // 如果content script未注入，尝试重新注入
      if (error.message && error.message.includes('Could not establish connection')) {
        console.log('🔧 尝试重新注入content script...');
        
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          
          // 注入content script和CSS
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['styles.css']
          });
          
          console.log('✅ Content script重新注入成功');
          
          // 等待一段时间后重试操作
          setTimeout(async () => {
            try {
              console.log('🔄 重试操作:', action);
              const response = await chrome.tabs.sendMessage(tab.id, { action: action });
              console.log('✅ 重试操作成功:', response);
            } catch (retryError) {
              console.error('❌ 重试操作失败:', retryError);
              this.showNotification('操作执行失败，请刷新页面后重试');
            }
          }, 1000); // 增加等待时间到1秒
          
        } catch (injectError) {
          console.error('❌ 注入脚本失败:', injectError);
          this.showNotification('脚本注入失败，请刷新页面后重试');
        }
      } else {
        this.showNotification('操作执行失败');
      }
    }
  }
  
  // 显示用户通知
  showNotification(message) {
    // 创建临时通知元素
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 9999;
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  async changeTheme(theme) {
    try {
      this.currentTheme = theme;
      this.updateUI();
      
      // 保存设置
      const result = await chrome.storage.sync.get(['floatingNavSettings']);
      const settings = result.floatingNavSettings || {};
      settings.theme = theme;
      await chrome.storage.sync.set({ floatingNavSettings: settings });
      
      // 通知background script更新主题
      chrome.runtime.sendMessage({ action: 'changeTheme', theme: theme });
      
      console.log('主题已切换到:', theme);
    } catch (error) {
      console.error('切换主题失败:', error);
    }
  }

  isSpecialUrl(url) {
    const specialProtocols = ['chrome://', 'chrome-extension://', 'moz-extension://', 'edge://', 'about:', 'devtools://'];
    return specialProtocols.some(protocol => url.startsWith(protocol));
  }

  closePopup() {
    // 关闭弹窗
    setTimeout(() => {
      window.close();
    }, 100);
  }
}

// 等待DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// 处理快捷键
document.addEventListener('keydown', (e) => {
  // ESC键关闭弹窗
  if (e.key === 'Escape') {
    window.close();
  }
  
  // 数字键快速选择功能
  const numKeys = {
    '1': 'toggle-nav',
    '2': 'scroll-top',
    '3': 'scroll-bottom',
    '4': 'refresh-page',
    '5': 'open-settings'
  };
  
  if (numKeys[e.key]) {
    e.preventDefault();
    document.getElementById(numKeys[e.key]).click();
  }
});
