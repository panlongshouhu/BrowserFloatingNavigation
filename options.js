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
    const mainLayout = document.querySelector('.main-layout');
    
    welcomeSection.classList.remove('hidden');
    if (mainLayout) {
      mainLayout.style.display = 'none';
    }
  }

  hideWelcome() {
    const welcomeSection = document.getElementById('welcome-section');
    const mainLayout = document.querySelector('.main-layout');
    
    welcomeSection.classList.add('hidden');
    if (mainLayout) {
      mainLayout.style.display = 'flex';
    }
    document.getElementById('general-tab').style.display = 'block';
  }

  async completeWelcomeSetup() {
    try {
      console.log('🎉 用户点击开始设置，完成欢迎流程');
      
      // 隐藏欢迎页面
      this.hideWelcome();
      
      // 更新设置中的欢迎完成标记
      this.settings.isWelcomeCompleted = true;
      await this.saveSettings();
      
      // 通知background script完成欢迎设置
      chrome.runtime.sendMessage({ 
        action: 'completeWelcome'
      });
      
      // 显示成功消息
      this.showStatus('欢迎设置完成，悬浮导航已启用！', 'success');
      
      console.log('✅ 欢迎设置流程完成');
    } catch (error) {
      console.error('完成欢迎设置失败:', error);
      this.showStatus('设置失败，请重试', 'error');
    }
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
      buttonSize: 80, // 改为百分比数值，80%
      buttonOpacity: 90, // 新增透明度设置，90%
      theme: 'default',
      customColor: '#3b82f6', // 自定义主题颜色
      isWelcomeCompleted: true, // 在设置页面中默认为已完成
      isManuallyHidden: false, // 默认显示悬浮导航
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
      // shortcuts功能已移除，专注核心功能体验
    };
  }

  initializeUI() {
    // 初始化标签页显示状态
    this.initializeTabState();
    
    // 常规设置
    document.getElementById('enableAnimation').checked = this.settings.enableAnimation;
    
    // 显示悬浮导航状态 - 基于isManuallyHidden的反向状态
    const showFloatingNavCheckbox = document.getElementById('showFloatingNav');
    showFloatingNavCheckbox.checked = !this.settings.isManuallyHidden;
    console.log('🎯 初始化显示悬浮导航开关状态:', !this.settings.isManuallyHidden);
    
    // 按钮大小滑动条
    const buttonSizeSlider = document.getElementById('buttonSize');
    const buttonSizeValue = document.getElementById('buttonSizeValue');
    buttonSizeSlider.value = this.settings.buttonSize || 80;
    buttonSizeValue.textContent = buttonSizeSlider.value;
    
    // 按钮透明度滑动条
    const buttonOpacitySlider = document.getElementById('buttonOpacity');
    const buttonOpacityValue = document.getElementById('buttonOpacityValue');
    buttonOpacitySlider.value = this.settings.buttonOpacity || 90;
    buttonOpacityValue.textContent = buttonOpacitySlider.value;
    
    // 位置设置
    this.updatePositionButtons();
    
    // 主题设置
    this.updateThemeSelection();
    
    // 自定义颜色设置
    this.initializeCustomColor();
    
    // 功能按钮设置
    this.updateFunctionButtons();
    
    // 快捷键设置已移除
  }

  initializeTabState() {
    console.log('🔧 初始化标签页状态');
    
    // 确保所有标签页内容都被隐藏
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
      content.style.display = 'none';
    });
    
    // 确保所有导航项都不是激活状态
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // 显示默认标签页（常规设置）
    const defaultTab = 'general';
    const defaultNavItem = document.querySelector(`[data-tab="${defaultTab}"]`);
    const defaultContent = document.getElementById(`${defaultTab}-tab`);
    
    if (defaultNavItem && defaultContent) {
      defaultNavItem.classList.add('active');
      defaultContent.classList.add('active');
      defaultContent.style.display = 'block';
      console.log('✅ 默认标签页已激活:', defaultTab);
    } else {
      console.error('❌ 无法找到默认标签页元素');
    }
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

  // updateShortcuts方法已移除，快捷键功能已隐藏

  bindEvents() {
    // 欢迎页面开始按钮
    document.getElementById('start-setup')?.addEventListener('click', () => {
      this.completeWelcomeSetup();
    });

    // 标签切换
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 确保获取到正确的 data-tab 值
        const navItem = e.target.closest('.nav-item');
        const tabName = navItem ? navItem.dataset.tab : null;
        
        if (tabName) {
          console.log('切换到标签页:', tabName);
          this.switchTab(tabName);
        } else {
          console.error('未找到标签页名称');
        }
      });
    });

    // 常规设置
    document.getElementById('enableAnimation').addEventListener('change', (e) => {
      this.settings.enableAnimation = e.target.checked;
      this.saveSettings();
    });

    // 显示悬浮导航切换
    document.getElementById('showFloatingNav').addEventListener('change', (e) => {
      this.toggleFloatingNavVisibility(e.target.checked);
    });

    // 按钮大小滑动条事件
    const buttonSizeSlider = document.getElementById('buttonSize');
    const buttonSizeValue = document.getElementById('buttonSizeValue');
    
    buttonSizeSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      buttonSizeValue.textContent = value;
      this.settings.buttonSize = value;
      
      // 实时更新，但延迟保存以避免频繁写入
      clearTimeout(this.buttonSizeTimeout);
      this.buttonSizeTimeout = setTimeout(() => {
        this.saveSettings();
        this.showStatus(`按钮大小已调整为: ${value}%`, 'success');
      }, 300);
    });
    
    // 按钮透明度滑动条事件
    const buttonOpacitySlider = document.getElementById('buttonOpacity');
    const buttonOpacityValue = document.getElementById('buttonOpacityValue');
    
    buttonOpacitySlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      buttonOpacityValue.textContent = value;
      this.settings.buttonOpacity = value;
      
      // 实时更新，但延迟保存以避免频繁写入
      clearTimeout(this.buttonOpacityTimeout);
      this.buttonOpacityTimeout = setTimeout(() => {
        this.saveSettings();
        this.showStatus(`按钮透明度已调整为: ${value}%`, 'success');
      }, 300);
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

    // 自定义颜色事件
    this.bindCustomColorEvents();

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
    console.log('🔄 开始切换标签页到:', tabName);
    
    // 更新导航项
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeNavItem) {
      activeNavItem.classList.add('active');
      console.log('✅ 导航项已激活:', tabName);
    } else {
      console.error('❌ 未找到导航项:', tabName);
    }

    // 更新内容区域 - 先隐藏所有内容
    const allTabContents = document.querySelectorAll('.tab-content');
    console.log('📋 找到标签内容数量:', allTabContents.length);
    
    allTabContents.forEach((content, index) => {
      content.classList.remove('active');
      content.style.display = 'none'; // 强制隐藏
      console.log(`🔒 隐藏标签页 ${index + 1}: ${content.id}`);
    });
    
    // 显示当前标签页内容
    const currentTabContent = document.getElementById(`${tabName}-tab`);
    if (currentTabContent) {
      currentTabContent.classList.add('active');
      currentTabContent.style.display = 'block'; // 强制显示
      console.log('✅ 显示当前标签页内容:', `${tabName}-tab`);
    } else {
      console.error('❌ 未找到标签页内容:', `${tabName}-tab`);
    }
    
    console.log('🎯 标签页切换完成');
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

  // 切换悬浮导航显示/隐藏状态
  async toggleFloatingNavVisibility(shouldShow) {
    try {
      console.log('🎯 设置页面切换悬浮导航可见性:', shouldShow);
      
      // 更新设置中的手动隐藏状态（与shouldShow相反）
      this.settings.isManuallyHidden = !shouldShow;
      await this.saveSettings();
      
      // 通过background script广播状态变化到所有标签页
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'broadcastHideState',
          isManuallyHidden: !shouldShow
        });
        
        console.log('✅ 悬浮导航状态广播成功:', response);
        
        // 显示状态提示
        const statusText = shouldShow ? '悬浮导航已显示' : '悬浮导航已隐藏';
        this.showStatus(statusText, 'success');
        
      } catch (error) {
        console.error('广播切换状态失败:', error);
        this.showStatus('切换失败', 'error');
      }
      
    } catch (error) {
      console.error('切换悬浮导航可见性失败:', error);
      this.showStatus('操作失败', 'error');
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

  // 自定义颜色功能
  initializeCustomColor() {
    const customColorInput = document.getElementById('customColor');
    const customColorValue = document.getElementById('customColorValue');
    
    if (customColorInput && customColorValue) {
      customColorInput.value = this.settings.customColor || '#3b82f6';
      customColorValue.textContent = this.settings.customColor || '#3b82f6';
    }
  }

  applyCustomColor() {
    const customColor = document.getElementById('customColor').value;
    
    // 保存自定义颜色
    this.settings.customColor = customColor;
    this.settings.theme = 'custom';
    
    this.saveSettings();
    this.updateThemeSelection();
    
    // 通知content script应用自定义颜色
    chrome.runtime.sendMessage({
      action: 'applyCustomColor',
      color: customColor
    });
    
    this.showStatus(`已应用自定义颜色: ${customColor}`, 'success');
  }

  resetCustomColor() {
    const defaultColor = '#3b82f6';
    
    document.getElementById('customColor').value = defaultColor;
    document.getElementById('customColorValue').textContent = defaultColor;
    
    this.settings.customColor = defaultColor;
    this.saveSettings();
    
    this.showStatus('颜色已重置为默认蓝色', 'success');
  }

  setPresetColor(color) {
    const customColorInput = document.getElementById('customColor');
    const customColorValue = document.getElementById('customColorValue');
    
    if (customColorInput && customColorValue) {
      customColorInput.value = color;
      customColorValue.textContent = color;
    }
    
    // 自动应用预设颜色
    this.settings.customColor = color;
    this.settings.theme = 'custom';
    
    this.saveSettings();
    this.updateThemeSelection();
    
    // 通知content script应用自定义颜色
    chrome.runtime.sendMessage({
      action: 'applyCustomColor',
      color: color
    });
    
    this.showStatus(`已应用预设颜色: ${color}`, 'success');
  }

  bindCustomColorEvents() {
    // 颜色选择器变化事件
    const customColorInput = document.getElementById('customColor');
    const customColorValue = document.getElementById('customColorValue');
    
    if (customColorInput && customColorValue) {
      customColorInput.addEventListener('input', (e) => {
        customColorValue.textContent = e.target.value;
      });
    }
    
    // 应用自定义颜色按钮
    document.getElementById('applyCustomColor')?.addEventListener('click', () => {
      this.applyCustomColor();
    });
    
    // 重置颜色按钮
    document.getElementById('resetCustomColor')?.addEventListener('click', () => {
      this.resetCustomColor();
    });
    
    // 颜色预设按钮
    document.querySelectorAll('.color-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        this.setPresetColor(color);
        
        // 更新选中状态
        document.querySelectorAll('.color-preset-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
      });
    });
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
