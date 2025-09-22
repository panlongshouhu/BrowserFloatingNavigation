// 后台服务工作脚本
class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    console.log('🔄 开始初始化悬浮导航后台服务...');
    
    // 监听扩展安装/更新事件
    try {
      chrome.runtime.onInstalled.addListener((details) => {
        this.handleInstall(details);
      });
      console.log('✅ 安装事件监听器已注册');
    } catch (error) {
      console.error('❌ 安装事件监听器注册失败:', error);
    }

    // 监听来自content script的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });

    // 监听标签页更新事件
    try {
      if (chrome && chrome.tabs && chrome.tabs.onUpdated) {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          this.handleTabUpdate(tabId, changeInfo, tab);
        });
        console.log('✅ 标签页事件监听器已注册');
      }
    } catch (error) {
      console.error('❌ 标签页事件监听器注册失败:', error);
    }

    // 监听标签页激活事件，实现单实例悬浮按钮
    try {
      if (chrome && chrome.tabs && chrome.tabs.onActivated) {
        chrome.tabs.onActivated.addListener((activeInfo) => {
          this.handleTabActivated(activeInfo);
        });
        console.log('✅ 标签页激活事件监听器注册成功');
      } else {
        console.warn('⚠️ chrome.tabs.onActivated API不可用');
      }
    } catch (error) {
      console.error('❌ 标签页激活事件监听器注册失败:', error);
    }

    // 监听窗口焦点变化事件
    try {
      if (chrome && chrome.windows && chrome.windows.onFocusChanged) {
        chrome.windows.onFocusChanged.addListener((windowId) => {
          this.handleWindowFocusChanged(windowId);
        });
        console.log('✅ 窗口焦点变化事件监听器注册成功');
      } else {
        console.warn('⚠️ chrome.windows.onFocusChanged API不可用');
      }
    } catch (error) {
      console.error('❌ 窗口焦点变化事件监听器注册失败:', error);
    }

    // 快捷键功能已移除，专注核心悬浮导航体验
  }

  // initializeCommands方法已移除，快捷键功能已隐藏

  async handleInstall(details) {
    console.log('悬浮导航扩展已安装/更新:', details);
    
    // 设置默认设置
    if (details.reason === 'install') {
      await this.setDefaultSettings();
      // 打开欢迎页面
      chrome.tabs.create({ url: 'options.html?welcome=true' });
    }
    
    if (details.reason === 'update') {
      console.log('扩展已更新到版本:', chrome.runtime.getManifest().version);
    }
  }

  async setDefaultSettings() {
    // Service Worker环境没有window对象，使用合理的默认值
    const defaultSettings = {
      floatingNavSettings: {
        position: { x: 1200, y: 600 }, // 默认位置，会在content script中自动调整
        enableAnimation: true,
        buttonSize: 80, // 默认80%大小
        buttonOpacity: 90, // 默认90%透明度
        theme: 'default',
        customColor: '#3b82f6',
        isWelcomeCompleted: false, // 欢迎预览状态标记（不影响悬浮导航显示）
        enabledButtons: {
          scrollTop: true,
          scrollBottom: true,
          refresh: true,
          back: true,
          forward: true,
          newTab: true,
          bookmark: true,
          settings: true,
          copyLink: false,
          fullscreen: false,
          closeTab: false
        }
      }
    };
    
    try {
      await chrome.storage.sync.set(defaultSettings);
      console.log('默认设置已保存');
    } catch (error) {
      console.error('保存默认设置失败:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'newTab':
          await this.createNewTab();
          break;
          
        case 'addBookmark':
          await this.addBookmark(message.url, message.title);
          break;
          
        case 'openOptions':
          await this.openOptions();
          break;
          
        case 'getSettings':
          const settings = await this.getSettings();
          sendResponse(settings);
          break;
          
        case 'saveSettings':
          await this.saveSettings(message.settings);
          await this.notifySettingsChange(message.settings);
          break;
          
        case 'changeTheme':
          await this.changeTheme(message.theme);
          break;
          
        case 'exportSettings':
          const exportData = await this.exportSettings();
          sendResponse(exportData);
          break;
          
        case 'importSettings':
          await this.importSettings(message.settings);
          break;
          
        case 'completeWelcome':
          await this.completeWelcomeSetup();
          break;
          
        case 'closeTab':
          const result = await this.closeCurrentTab(sender.tab?.id);
          sendResponse(result);
          break;
          
        default:
          console.log('未知消息类型:', message.action);
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ error: error.message });
    }
  }

  // handleCommand方法已移除，快捷键功能已隐藏

  handleTabUpdate(tabId, changeInfo, tab) {
    // 当页面加载完成时，可以进行一些初始化操作
    if (changeInfo.status === 'complete' && tab.url && !this.isSpecialUrl(tab.url)) {
      // 确保content script已注入
      this.ensureContentScriptInjected(tabId, tab.url);
    }
  }

  // 处理标签页激活事件
  async handleTabActivated(activeInfo) {
    try {
      console.log('📋 标签页激活:', activeInfo);
      
      // 获取所有标签页
      const tabs = await chrome.tabs.query({});
      
      // 向所有标签页发送激活状态消息
      tabs.forEach(tab => {
        if (tab.id && !this.isSpecialUrl(tab.url || '')) {
          const isActive = tab.id === activeInfo.tabId;
          chrome.tabs.sendMessage(tab.id, {
            action: 'tabActivated',
            tabId: tab.id,
            isActive: isActive
          }).catch(() => {
            // 忽略无法发送消息的标签页（可能还没有content script）
          });
        }
      });
    } catch (error) {
      console.error('处理标签页激活事件失败:', error);
    }
  }

  // 处理窗口焦点变化事件
  async handleWindowFocusChanged(windowId) {
    try {
      console.log('🪟 窗口焦点变化:', windowId);
      
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // 所有窗口都失去焦点，隐藏所有悬浮按钮
        const tabs = await chrome.tabs.query({});
        tabs.forEach(tab => {
          if (tab.id && !this.isSpecialUrl(tab.url || '')) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'tabActivated',
              tabId: tab.id,
              isActive: false
            }).catch(() => {});
          }
        });
      } else {
        // 获取当前窗口的活跃标签页
        try {
          const activeTabs = await chrome.tabs.query({ active: true, windowId: windowId });
          if (activeTabs.length > 0) {
            this.handleTabActivated({ tabId: activeTabs[0].id, windowId: windowId });
          }
        } catch (error) {
          console.error('获取活跃标签页失败:', error);
        }
      }
    } catch (error) {
      console.error('处理窗口焦点变化事件失败:', error);
    }
  }

  async ensureContentScriptInjected(tabId, url) {
    // 再次检查URL，确保不是特殊页面
    if (this.isSpecialUrl(url)) {
      console.log('跳过特殊页面的脚本注入:', url);
      return;
    }

    try {
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      console.log('✅ Content script已存在于标签页:', tabId);
    } catch (error) {
      // 如果无法发送消息，说明content script未注入，重新注入
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: ['styles.css']
        });
        console.log('✅ Content script注入成功:', tabId);
      } catch (injectError) {
        console.log('ℹ️  无法注入content script到标签页', tabId, '原因:', injectError.message);
        // 这通常是正常的，某些页面不允许注入脚本
      }
    }
  }

  async createNewTab() {
    try {
      await chrome.tabs.create({ url: 'chrome://newtab/' });
    } catch (error) {
      console.error('创建新标签页失败:', error);
    }
  }

  async addBookmark(url, title) {
    try {
      // 检查书签权限
      const permissions = await chrome.permissions.getAll();
      if (!permissions.permissions.includes('bookmarks')) {
        console.log('需要书签权限');
        return;
      }

      // 获取书签栏文件夹
      const bookmarkTree = await chrome.bookmarks.getTree();
      const bookmarkBar = bookmarkTree[0].children.find(node => node.id === '1');
      
      if (bookmarkBar) {
        await chrome.bookmarks.create({
          parentId: bookmarkBar.id,
          title: title || url,
          url: url
        });
        console.log('书签添加成功');
        
        // 通知用户
        this.showNotification('书签已添加', title || url);
      }
    } catch (error) {
      console.error('添加书签失败:', error);
      this.showNotification('添加书签失败', error.message);
    }
  }

  async closeCurrentTab(tabId) {
    try {
      if (tabId) {
        await chrome.tabs.remove(tabId);
        console.log('✖ 标签页已关闭:', tabId);
        return { success: true };
      } else {
        console.warn('⚠️ 无法获取标签页ID');
        return { success: false, error: '无法获取标签页ID' };
      }
    } catch (error) {
      console.error('关闭标签页失败:', error);
      return { success: false, error: error.message };
    }
  }

  async openOptions() {
    try {
      await chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error('打开设置页面失败:', error);
      // 回退方案
      chrome.tabs.create({ url: 'options.html' });
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.sync.get(['floatingNavSettings']);
      return result.floatingNavSettings || {};
    } catch (error) {
      console.error('获取设置失败:', error);
      return {};
    }
  }

  async saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ floatingNavSettings: settings });
      console.log('设置已保存');
    } catch (error) {
      console.error('保存设置失败:', error);
      throw error;
    }
  }

  async notifySettingsChange(settings) {
    try {
      // 通知所有标签页设置已更改
      const tabs = await chrome.tabs.query({});
      let successCount = 0;
      
      for (const tab of tabs) {
        if (tab.url && !this.isSpecialUrl(tab.url)) {
          try {
            await chrome.tabs.sendMessage(tab.id, { 
              action: 'updateSettings', 
              settings: settings 
            });
            successCount++;
          } catch (error) {
            // 静默忽略无法发送消息的标签页
          }
        }
      }
      
      console.log(`✅ 设置更新已通知 ${successCount} 个标签页`);
    } catch (error) {
      console.error('通知设置更改失败:', error);
    }
  }

  async changeTheme(theme) {
    try {
      const currentSettings = await this.getSettings();
      currentSettings.theme = theme;
      await this.saveSettings(currentSettings);
      
      // 通知所有标签页主题已更改
      const tabs = await chrome.tabs.query({});
      let themeUpdateCount = 0;
      
      for (const tab of tabs) {
        if (tab.url && !this.isSpecialUrl(tab.url)) {
          try {
            await chrome.tabs.sendMessage(tab.id, { 
              action: 'changeTheme', 
              theme: theme 
            });
            themeUpdateCount++;
          } catch (error) {
            // 静默忽略无法发送消息的标签页
          }
        }
      }
      
      console.log(`✅ 主题更新已应用到 ${themeUpdateCount} 个标签页`);
    } catch (error) {
      console.error('更改主题失败:', error);
    }
  }

  async completeWelcomeSetup() {
    try {
      console.log('🎉 用户完成欢迎设置，启用悬浮导航');
      
      // 获取当前设置
      const currentSettings = await this.getSettings();
      
      // 更新欢迎完成标记
      currentSettings.isWelcomeCompleted = true;
      
      // 保存设置
      await this.saveSettings(currentSettings);
      
      // 通知所有标签页完成欢迎设置
      const tabs = await chrome.tabs.query({});
      let welcomeCompleteCount = 0;
      
      for (const tab of tabs) {
        if (tab.url && !this.isSpecialUrl(tab.url)) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'completeWelcome'
            });
            welcomeCompleteCount++;
          } catch (error) {
            // 静默忽略无法发送消息的标签页
          }
        }
      }
      
      console.log(`✅ 欢迎设置完成通知已发送到 ${welcomeCompleteCount} 个标签页`);
    } catch (error) {
      console.error('完成欢迎设置失败:', error);
    }
  }

  async exportSettings() {
    try {
      const settings = await chrome.storage.sync.get(null);
      return {
        version: chrome.runtime.getManifest().version,
        exported: new Date().toISOString(),
        settings: settings
      };
    } catch (error) {
      console.error('导出设置失败:', error);
      throw error;
    }
  }

  async importSettings(importData) {
    try {
      if (importData && importData.settings) {
        await chrome.storage.sync.clear();
        await chrome.storage.sync.set(importData.settings);
        console.log('设置导入成功');
        
        // 通知所有标签页设置已更新
        await this.notifySettingsChange(importData.settings.floatingNavSettings);
      }
    } catch (error) {
      console.error('导入设置失败:', error);
      throw error;
    }
  }

  showNotification(title, message) {
    try {
      if (chrome && chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: title,
          message: message
        });
      } else {
        console.log('通知:', title, '-', message);
      }
    } catch (error) {
      console.error('显示通知失败:', error);
    }
  }

  // 获取当前活动标签页
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    } catch (error) {
      console.error('获取当前标签页失败:', error);
      return null;
    }
  }

  // 检查URL是否为特殊页面（不能注入content script）
  isSpecialUrl(url) {
    if (!url) return true;
    
    const specialProtocols = [
      'chrome://',           // Chrome内部页面
      'chrome-extension://', // 扩展页面
      'moz-extension://',    // Firefox扩展页面  
      'edge://',            // Edge内部页面
      'about:',             // 关于页面
      'data:',              // Data URL
      'file://',            // 本地文件
      'javascript:',        // JavaScript URL
      'view-source:'        // 查看源码页面
    ];
    
    const isSpecial = specialProtocols.some(protocol => url.startsWith(protocol));
    
    if (isSpecial) {
      console.log('🚫 检测到特殊页面，跳过脚本注入:', url);
    }
    
    return isSpecial;
  }
}

// 全局错误处理
self.addEventListener('error', (event) => {
  console.error('🚨 Service Worker 全局错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 未处理的Promise拒绝:', event.reason);
});

// 安全地初始化后台服务
try {
  const backgroundService = new BackgroundService();
  console.log('🚀 悬浮导航后台服务启动成功');
} catch (error) {
  console.error('❌ 后台服务启动失败:', error);
}
