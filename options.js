// 设置页面管理类
class OptionsManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    // 检查是否为欢迎页面
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('welcome') === 'true') {
      this.showWelcome();
    }

    // 加载设置
    await this.loadSettings();
    
    // 初始化UI
    this.initializeUI();
    
    // 绑定事件
    this.bindEvents();
    
    // 更新版本信息
    this.updateVersionInfo();
  }

  showWelcome() {
    const welcomeSection = document.getElementById('welcome-section');
    const tabNav = document.querySelector('.tab-nav');
    const tabContents = document.querySelectorAll('.tab-content');
    
    welcomeSection.classList.remove('hidden');
    tabNav.style.display = 'none';
    tabContents.forEach(content => content.style.display = 'none');
  }

  hideWelcome() {
    const welcomeSection = document.getElementById('welcome-section');
    const tabNav = document.querySelector('.tab-nav');
    const tabContents = document.querySelectorAll('.tab-content');
    
    welcomeSection.classList.add('hidden');
    tabNav.style.display = 'flex';
    document.getElementById('general-tab').style.display = 'block';
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['floatingNavSettings']);
      this.settings = result.floatingNavSettings || this.getDefaultSettings();
      console.log('设置已加载:', this.settings);
    } catch (error) {
      console.error('加载设置失败:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      position: { x: window.screen.width - 80, y: window.screen.height - 80 },
      enableAnimation: true,
      showLabels: true,
      buttonSize: 'medium',
      theme: 'default',
      enabledButtons: {
        scrollTop: true,
        scrollBottom: true,
        refresh: true,
        back: true,
        forward: true,
        newTab: true,
        bookmark: true,
        settings: true
      },
      shortcuts: {
        toggleNav: 'Ctrl+Shift+F',
        scrollTop: 'Ctrl+Home',
        scrollBottom: 'Ctrl+End'
      }
    };
  }

  initializeUI() {
    // 常规设置
    document.getElementById('enableAnimation').checked = this.settings.enableAnimation;
    document.getElementById('showLabels').checked = this.settings.showLabels;
    document.getElementById('buttonSize').value = this.settings.buttonSize;
    
    // 位置设置
    this.updatePositionButtons();
    
    // 主题设置
    this.updateThemeSelection();
    
    // 功能按钮设置
    this.updateFunctionButtons();
    
    // 快捷键设置
    this.updateShortcuts();
  }

  updatePositionButtons() {
    const buttons = document.querySelectorAll('.position-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // 根据当前位置确定激活的按钮
    const position = this.getPositionFromCoords(this.settings.position);
    const activeBtn = document.querySelector(`[data-position="${position}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  getPositionFromCoords(coords) {
    const { x, y } = coords;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    const leftThird = screenWidth / 3;
    const rightThird = screenWidth * 2 / 3;
    const topThird = screenHeight / 3;
    const bottomThird = screenHeight * 2 / 3;
    
    if (y < topThird) {
      if (x < leftThird) return 'top-left';
      if (x > rightThird) return 'top-right';
      return 'top-center';
    } else if (y > bottomThird) {
      if (x < leftThird) return 'bottom-left';
      if (x > rightThird) return 'bottom-right';
      return 'bottom-center';
    } else {
      if (x < leftThird) return 'center-left';
      if (x > rightThird) return 'center-right';
      return 'center';
    }
  }

  updateThemeSelection() {
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
      card.classList.remove('active');
      if (card.dataset.theme === this.settings.theme) {
        card.classList.add('active');
      }
    });
  }

  updateFunctionButtons() {
    Object.entries(this.settings.enabledButtons).forEach(([key, enabled]) => {
      const checkbox = document.getElementById(`func-${key}`);
      if (checkbox) {
        checkbox.checked = enabled;
      }
    });
  }

  updateShortcuts() {
    Object.entries(this.settings.shortcuts).forEach(([key, shortcut]) => {
      const input = document.getElementById(`shortcut-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
      if (input) {
        input.value = shortcut;
      }
    });
  }

  bindEvents() {
    // 欢迎页面开始按钮
    document.getElementById('start-setup')?.addEventListener('click', () => {
      this.hideWelcome();
    });

    // 标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // 常规设置
    document.getElementById('enableAnimation').addEventListener('change', (e) => {
      this.settings.enableAnimation = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('showLabels').addEventListener('change', (e) => {
      this.settings.showLabels = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('buttonSize').addEventListener('change', (e) => {
      this.settings.buttonSize = e.target.value;
      this.saveSettings();
      this.showStatus(`按钮大小已更改为: ${e.target.value}`, 'success');
    });

    // 位置设置
    document.querySelectorAll('.position-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setPosition(e.target.dataset.position);
      });
    });

    // 主题设置
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const themeCard = e.currentTarget;
        const theme = themeCard.dataset.theme;
        
        // 所有主题都免费使用
        this.changeTheme(theme);
      });
    });

    // 功能按钮设置
    Object.keys(this.settings.enabledButtons).forEach(key => {
      const checkbox = document.getElementById(`func-${key}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          this.settings.enabledButtons[key] = e.target.checked;
          this.saveSettings();
        });
      }
    });

    // 高级选项
    document.getElementById('export-settings')?.addEventListener('click', () => {
      this.exportSettings();
    });

    document.getElementById('import-settings')?.addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file')?.addEventListener('change', (e) => {
      this.importSettings(e.target.files[0]);
    });

    document.getElementById('reset-position')?.addEventListener('click', () => {
      this.resetPosition();
    });

    document.getElementById('reset-all')?.addEventListener('click', () => {
      this.resetAll();
    });

    // 链接点击
    document.querySelectorAll('.link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleLinkClick(link.textContent);
      });
    });
  }

  switchTab(tabName) {
    // 更新标签按钮
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 更新内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  setPosition(position) {
    const coords = this.getPositionCoords(position);
    this.settings.position = coords;
    this.updatePositionButtons();
    this.saveSettings();
  }

  getPositionCoords(position) {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const margin = 80;

    const positions = {
      'top-left': { x: margin, y: margin },
      'top-center': { x: screenWidth / 2 - margin, y: margin },
      'top-right': { x: screenWidth - margin, y: margin },
      'center-left': { x: margin, y: screenHeight / 2 - margin },
      'center': { x: screenWidth / 2 - margin, y: screenHeight / 2 - margin },
      'center-right': { x: screenWidth - margin, y: screenHeight / 2 - margin },
      'bottom-left': { x: margin, y: screenHeight - margin },
      'bottom-center': { x: screenWidth / 2 - margin, y: screenHeight - margin },
      'bottom-right': { x: screenWidth - margin, y: screenHeight - margin }
    };

    return positions[position] || positions['bottom-right'];
  }

  changeTheme(theme) {
    this.settings.theme = theme;
    this.updateThemeSelection();
    this.saveSettings();
    
    // 发送消息给background script
    chrome.runtime.sendMessage({ action: 'changeTheme', theme: theme });
    
    this.showStatus('主题已更换', 'success');
  }

  // VIP功能已移除，所有主题免费使用

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ floatingNavSettings: this.settings });
      
      // 通知background script设置已更新
      chrome.runtime.sendMessage({ 
        action: 'saveSettings', 
        settings: this.settings 
      });
      
      console.log('设置已保存:', this.settings);
    } catch (error) {
      console.error('保存设置失败:', error);
      this.showStatus('设置保存失败', 'error');
    }
  }

  exportSettings() {
    try {
      const exportData = {
        version: chrome.runtime.getManifest().version,
        exported: new Date().toISOString(),
        settings: this.settings
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `floating-nav-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showStatus('设置已导出', 'success');
    } catch (error) {
      console.error('导出设置失败:', error);
      this.showStatus('导出失败', 'error');
    }
  }

  async importSettings(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (importData.settings) {
        this.settings = { ...this.getDefaultSettings(), ...importData.settings };
        await this.saveSettings();
        this.initializeUI();
        this.showStatus('设置已导入', 'success');
        
        setTimeout(() => {
          location.reload();
        }, 2000);
      } else {
        throw new Error('无效的设置文件格式');
      }
    } catch (error) {
      console.error('导入设置失败:', error);
      this.showStatus('导入失败：' + error.message, 'error');
    }
  }

  resetPosition() {
    const defaultPosition = { x: window.screen.width - 80, y: window.screen.height - 80 };
    this.settings.position = defaultPosition;
    this.updatePositionButtons();
    this.saveSettings();
    this.showStatus('位置已重置', 'success');
  }

  resetAll() {
    if (confirm('确定要恢复所有默认设置吗？这将清除您的所有自定义配置。')) {
      this.settings = this.getDefaultSettings();
      this.saveSettings();
      this.initializeUI();
      this.showStatus('已恢复默认设置', 'success');
    }
  }

  handleLinkClick(linkText) {
    const actions = {
      '🐛 反馈问题': () => {
        window.open('https://github.com/your-repo/issues', '_blank');
      },
      '⭐ 评价扩展': () => {
        window.open('https://chrome.google.com/webstore/detail/your-extension-id', '_blank');
      },
      '📖 使用帮助': () => {
        this.showHelp();
      }
    };

    const action = actions[linkText];
    if (action) {
      action();
    }
  }

  showHelp() {
    const helpContent = `
    📖 使用帮助
    
    1. 基础使用：
       - 悬浮导航会自动出现在网页右下角
       - 点击主按钮展开功能菜单
       - 拖拽主按钮可以移动位置
    
    2. 功能说明：
       - 回到顶部/底部：快速滚动页面
       - 刷新：重新加载当前页面
       - 前进/后退：浏览器导航
       - 新标签页：打开新的空白页面
       - 添加书签：收藏当前页面
    
    3. 自定义设置：
       - 外观：选择喜欢的主题风格
       - 功能：启用/禁用特定按钮
       - 位置：设置默认显示位置
       - 动画：控制动画效果开关
    
    如有其他问题，请访问我们的帮助页面或联系客服。
    `;
    
    alert(helpContent);
  }

  updateVersionInfo() {
    const versionElement = document.getElementById('version');
    if (versionElement) {
      versionElement.textContent = chrome.runtime.getManifest().version;
    }
  }

  showStatus(message, type = 'success') {
    const statusElement = document.getElementById('status-message');
    const statusText = document.getElementById('status-text');
    
    if (statusElement && statusText) {
      statusText.textContent = message;
      statusElement.className = `status-message show ${type}`;
      
      setTimeout(() => {
        statusElement.classList.remove('show');
      }, 3000);
    }
  }
}

// 初始化设置管理器
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});
