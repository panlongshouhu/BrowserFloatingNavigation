// 浮动导航类
class FloatingNavigation {
  constructor() {
    this.isInitialized = false;
    this.isDragging = false;
    this.currentTheme = 'default';
    // 设置合理的默认位置
    const defaultX = Math.max(100, window.innerWidth - 80);
    const defaultY = Math.max(100, window.innerHeight - 80);
    
    this.settings = {
      position: { x: defaultX, y: defaultY },
      enableAnimation: true,
      buttonSize: 80, // 默认80%大小
      buttonOpacity: 90, // 默认90%透明度
      theme: 'default',
      customColor: '#3b82f6',
      enabledButtons: {
        scrollTop: true,
        scrollBottom: true,
        refresh: true,
        back: true,
        forward: true,
        newTab: true,
        bookmark: true,
        settings: true
      }
    };
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('🚀 开始初始化悬浮导航...');
    console.log('📍 当前页面URL:', window.location.href);
    
    // 加载用户设置
    await this.loadSettings();
    console.log('⚙️  设置已加载:', this.settings);
    
    // 检查是否已完成欢迎设置，如果没有则不显示悬浮导航
    if (this.settings.isWelcomeCompleted === false) {
      console.log('👋 检测到首次安装，等待用户完成欢迎设置后再显示悬浮导航');
      this.isInitialized = true;
      return;
    }
    
    // 创建悬浮导航
    this.createFloatingNav();
    console.log('🎨 悬浮导航UI已创建');
    
    // 绑定事件
    this.bindEvents();
    console.log('🎯 事件绑定完成');
    
    this.isInitialized = true;
    console.log('✅ 悬浮导航初始化完成！');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['floatingNavSettings']);
      if (result.floatingNavSettings) {
        this.settings = { ...this.settings, ...result.floatingNavSettings };
      }
    } catch (error) {
      console.log('设置加载失败，使用默认设置');
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ floatingNavSettings: this.settings });
    } catch (error) {
      console.error('设置保存失败:', error);
    }
  }

  createFloatingNav() {
    console.log('🔨 开始创建悬浮导航UI...');
    
    // 移除已存在的导航
    const existing = document.getElementById('floating-navigation');
    if (existing) {
      existing.remove();
      console.log('🗑️  移除了已存在的悬浮导航');
    }

    // 创建主容器
    this.container = document.createElement('div');
    this.container.id = 'floating-navigation';
    this.container.className = `floating-nav-container theme-${this.settings.theme}`;
    
    // 设置初始位置，确保在屏幕范围内
    const adjustedPosition = this.adjustPositionToScreen(this.settings.position);
    this.container.style.left = adjustedPosition.x + 'px';
    this.container.style.top = adjustedPosition.y + 'px';
    
    // 应用按钮大小和透明度
    this.applyButtonStyles();
    
    // 如果是自定义颜色主题，应用自定义颜色
    if (this.settings.theme === 'custom' && this.settings.customColor) {
      this.applyCustomColorStyles();
    }
    
    console.log('📍 设置位置:', adjustedPosition);
    console.log('📏 按钮大小:', this.settings.buttonSize + '%');
    console.log('🎭 按钮透明度:', this.settings.buttonOpacity + '%');
    console.log('🎨 主题:', this.settings.theme);
    if (this.settings.customColor) {
      console.log('🌈 自定义颜色:', this.settings.customColor);
    }

    // 创建主按钮
    this.mainButton = this.createButton('main', '⊕', '悬浮导航');
    this.container.appendChild(this.mainButton);
    console.log('🎯 主按钮已创建');

    // 创建展开的按钮组
    this.buttonGroup = document.createElement('div');
    this.buttonGroup.className = 'floating-nav-buttons';
    this.buttonGroup.style.display = 'none';

    // 创建功能按钮
    this.createFunctionButtons();
    console.log('🔧 功能按钮已创建');
    
    this.container.appendChild(this.buttonGroup);
    
    // 确保body存在再添加 - 快速添加策略
    if (document.body) {
      document.body.appendChild(this.container);
      console.log('✅ 悬浮导航已立即添加到页面！');
    } else {
      console.log('⏳ document.body未就绪，使用快速轮询...');
      // 使用快速轮询而不是等待DOMContentLoaded，更快响应
      const addToBody = () => {
        if (document.body) {
          document.body.appendChild(this.container);
          console.log('✅ 悬浮导航已快速添加到页面！');
        } else {
          // 每10ms检查一次，直到body可用
          setTimeout(addToBody, 10);
        }
      };
      addToBody();
    }
  }

  createFunctionButtons() {
    const allButtons = [
      { id: 'scroll-top', key: 'scrollTop', icon: '↑', label: '回到顶部', action: () => this.scrollToTop() },
      { id: 'settings', key: 'settings', icon: '⚙', label: '设置', action: () => this.openSettings() },
      { id: 'forward', key: 'forward', icon: '→', label: '前进', action: () => this.goForward() },
      { id: 'new-tab', key: 'newTab', icon: '⊞', label: '新标签页', action: () => this.newTab() },
      { id: 'scroll-bottom', key: 'scrollBottom', icon: '↓', label: '到达底部', action: () => this.scrollToBottom() },
      { id: 'bookmark', key: 'bookmark', icon: '★', label: '添加书签', action: () => this.addBookmark() },
      { id: 'back', key: 'back', icon: '←', label: '后退', action: () => this.goBack() },
      { id: 'refresh', key: 'refresh', icon: '⟲', label: '刷新页面', action: () => this.refreshPage() } 
    ];

    // 只创建启用的按钮
    const enabledButtons = allButtons.filter(btn => this.settings.enabledButtons[btn.key]);
    console.log('🔧 启用的按钮:', enabledButtons.map(btn => btn.label));

    enabledButtons.forEach((btn, index) => {
      const button = this.createButton(btn.id, btn.icon, btn.label);
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.action();
        this.hideButtons();
      });
      
      // 设置按钮位置（圆形均匀分布）
      const angle = (index * (360 / enabledButtons.length)) - 90; // 均匀分布，从顶部开始
      
      // 根据按钮大小百分比调整半径
      // 基础半径为70，根据百分比调整（50%-120%对应半径45-95）
      const baseRadius = 70;
      const sizePercent = this.settings.buttonSize / 100;
      const radius = Math.round(baseRadius * sizePercent);
      console.log('🔘 计算半径:', radius, '基于大小:', this.settings.buttonSize + '%');
      
      const radian = (angle * Math.PI) / 180;
      const x = Math.cos(radian) * radius;
      const y = Math.sin(radian) * radius;
      
      // 设置按钮的CSS变量用于定位
      button.style.setProperty('--x', `${x}px`);
      button.style.setProperty('--y', `${y}px`);
      console.log(`按钮 ${btn.id} 位置: 角度${angle}°, 坐标(${x.toFixed(1)}, ${y.toFixed(1)})`);
      
      this.buttonGroup.appendChild(button);
    });
    
    console.log('🎯 创建的功能按钮数量:', enabledButtons.length);
  }

  // 重新创建功能按钮（用于设置更改时动态更新）
  recreateFunctionButtons() {
    // 清空现有的功能按钮
    if (this.buttonGroup) {
      this.buttonGroup.innerHTML = '';
    }
    
    // 重新创建功能按钮
    this.createFunctionButtons();
    console.log('🔄 功能按钮已重新创建');
  }

  createButton(id, icon, title) {
    const button = document.createElement('div');
    button.className = `floating-nav-button ${id}`;
    button.innerHTML = `
      <span class="button-icon">${icon}</span>
    `;
    button.title = title; // 保留悬停提示
    button.setAttribute('data-id', id);
    return button;
  }
  
  // 应用按钮样式（大小和透明度）
  applyButtonStyles() {
    if (!this.container) return;
    
    const sizePercent = this.settings.buttonSize / 100; // 转换为小数
    const opacityPercent = this.settings.buttonOpacity / 100; // 转换为小数
    
    // 设置CSS变量，用于动态控制按钮大小和透明度
    this.container.style.setProperty('--button-size-scale', sizePercent);
    this.container.style.setProperty('--button-opacity', opacityPercent);
    
    console.log('🎨 应用按钮样式 - 大小:', sizePercent, '透明度:', opacityPercent);
  }

  bindEvents() {
    // 初始化隐藏定时器
    this.hideTimer = null;
    
    // 鼠标悬停显示菜单 - 智能悬停检测
    this.container.addEventListener('mouseenter', (e) => {
      if (!this.isDragging) {
        this.clearHideTimer();
        this.showButtons();
      }
    });

    // 鼠标离开时延迟隐藏菜单
    this.container.addEventListener('mouseleave', (e) => {
      if (!this.isDragging) {
        this.scheduleHideButtons();
      }
    });
    
    // 全局鼠标移动检测 - 使用节流避免过度检查
    this.lastMouseCheck = 0;
    this.globalMouseMoveHandler = (e) => {
      if (this.isDragging) return;
      
      // 节流：每50ms检查一次，提高性能
      const now = Date.now();
      if (now - this.lastMouseCheck < 50) return;
      this.lastMouseCheck = now;
      
      const isOverFloatingNav = this.isMouseOverFloatingNav(e.clientX, e.clientY);
      
      if (isOverFloatingNav) {
        this.clearHideTimer();
        this.showButtons();
      } else if (this.container.classList.contains('expanded')) {
        this.scheduleHideButtons();
      }
    };
    
    // 添加全局鼠标移动监听
    document.addEventListener('mousemove', this.globalMouseMoveHandler);

    // 拖拽事件
    this.mainButton.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // 左键
        e.preventDefault();
        e.stopPropagation();
        this.startDrag(e);
      }
    });

    // 窗口调整大小事件
    window.addEventListener('resize', () => {
      this.adjustPosition();
    });

    // 滚轮事件（在主按钮上滚动可以快速滚动页面）
    this.mainButton.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 100 : -100;
      window.scrollBy(0, delta);
    });
  }
  
  // 检查鼠标是否在悬浮导航区域内（包括功能按钮）
  isMouseOverFloatingNav(mouseX, mouseY) {
    const containerRect = this.container.getBoundingClientRect();
    const margin = 10; // 给一些边距容错
    
    // 检查主按钮区域
    const mainButtonRect = {
      left: containerRect.left - margin,
      right: containerRect.right + margin,
      top: containerRect.top - margin,
      bottom: containerRect.bottom + margin
    };
    
    if (mouseX >= mainButtonRect.left && mouseX <= mainButtonRect.right &&
        mouseY >= mainButtonRect.top && mouseY <= mainButtonRect.bottom) {
      return true;
    }
    
    // 如果菜单展开，检查功能按钮区域
    if (this.container.classList.contains('expanded')) {
      const buttons = this.buttonGroup.querySelectorAll('.floating-nav-button');
      for (const button of buttons) {
        const buttonRect = button.getBoundingClientRect();
        if (mouseX >= buttonRect.left - margin && mouseX <= buttonRect.right + margin &&
            mouseY >= buttonRect.top - margin && mouseY <= buttonRect.bottom + margin) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // 清除隐藏定时器
  clearHideTimer() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
  
  // 安排延迟隐藏菜单
  scheduleHideButtons() {
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => {
      this.hideButtons();
      this.hideTimer = null;
    }, 50); // 50ms延迟，快速响应鼠标移出
  }

  startDrag(e) {
    this.isDragging = true;
    
    // 检查菜单是否显示，如果显示则隐藏
    const isMenuVisible = this.buttonGroup.style.display !== 'none' && 
                         this.container.classList.contains('expanded');
    if (isMenuVisible) {
      this.hideButtons();
    }
    
    // 获取容器的实际位置
    const rect = this.container.getBoundingClientRect();
    
    // 计算鼠标点击位置相对于容器左上角的偏移
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // 添加拖拽样式
    this.container.classList.add('dragging');
    this.container.style.cursor = 'grabbing';
    this.container.style.transition = 'none';
    
    console.log('🖱️ 开始拖拽，偏移量:', this.dragOffset);

    const mouseMoveHandler = (e) => {
      if (!this.isDragging) return;
      
      // 计算新位置（鼠标位置减去偏移量）
      const newX = e.clientX - this.dragOffset.x;
      const newY = e.clientY - this.dragOffset.y;
      
      // 边界检查
      const maxX = window.innerWidth - this.container.offsetWidth;
      const maxY = window.innerHeight - this.container.offsetHeight;
      
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      // 直接设置位置，提高响应速度
      this.container.style.left = constrainedX + 'px';
      this.container.style.top = constrainedY + 'px';
      
      // 更新设置中的位置（实时更新，避免丢失）
      this.settings.position = {
        x: constrainedX,
        y: constrainedY
      };
    };

    const mouseUpHandler = () => {
      this.isDragging = false;
      
      // 恢复样式
      this.container.classList.remove('dragging');
      this.container.style.cursor = '';
      this.container.style.transition = '';
      
      // 保存最终位置
      this.saveSettings();
      
      console.log('🖱️ 拖拽结束，最终位置:', this.settings.position);
      
      // 移除事件监听器
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      
      // 拖拽结束后，使用浏览器原生的hover检测
      setTimeout(() => {
        if (this.container.matches(':hover')) {
          this.showButtons();
        }
      }, 100);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  toggleButtons() {
    const isVisible = this.buttonGroup.style.display !== 'none';
    if (isVisible) {
      this.hideButtons();
    } else {
      this.showButtons();
    }
  }

  showButtons() {
    // 清除任何待隐藏的定时器
    this.clearHideTimer();
    
    // 防止重复显示
    if (this.container.classList.contains('expanded')) {
      return;
    }
    
    this.buttonGroup.style.display = 'block';
    this.container.classList.add('expanded');
    
    console.log('📱 显示菜单按钮');
    
    // 按钮展开动画 - 更快的动画速度
    const buttons = this.buttonGroup.querySelectorAll('.floating-nav-button');
    buttons.forEach((button, index) => {
      setTimeout(() => {
        button.classList.add('show');
      }, index * 30); // 从50ms减少到30ms，更快的展开
    });
  }

  hideButtons() {
    // 清除隐藏定时器
    this.clearHideTimer();
    
    // 防止重复隐藏
    if (!this.container.classList.contains('expanded')) {
      return;
    }
    
    console.log('📱 隐藏菜单按钮');
    
    const buttons = this.buttonGroup.querySelectorAll('.floating-nav-button');
    buttons.forEach(button => button.classList.remove('show'));
    
    // 快速隐藏动画
    setTimeout(() => {
      this.buttonGroup.style.display = 'none';
      this.container.classList.remove('expanded');
    }, 150); // 与CSS动画时间匹配
  }
  
  // 销毁悬浮导航，清理事件监听器
  destroy() {
    console.log('🗑️ 销毁悬浮导航，清理资源');
    
    // 清除定时器
    this.clearHideTimer();
    
    // 移除全局事件监听器
    if (this.globalMouseMoveHandler) {
      document.removeEventListener('mousemove', this.globalMouseMoveHandler);
    }
    
    // 移除容器
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  adjustPositionToScreen(position) {
    // 确保位置在屏幕范围内
    const containerWidth = 56; // 主按钮宽度
    const containerHeight = 56; // 主按钮高度
    
    const maxX = window.innerWidth - containerWidth - 20; // 留20px边距
    const maxY = window.innerHeight - containerHeight - 20; // 留20px边距
    
    const adjustedX = Math.max(20, Math.min(position.x, maxX));
    const adjustedY = Math.max(20, Math.min(position.y, maxY));
    
    // 如果位置被调整了，保存新位置
    if (adjustedX !== position.x || adjustedY !== position.y) {
      this.settings.position = { x: adjustedX, y: adjustedY };
      this.saveSettings();
    }
    
    return { x: adjustedX, y: adjustedY };
  }

  adjustPosition() {
    const rect = this.container.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    
    let newX = Math.min(rect.left, maxX);
    let newY = Math.min(rect.top, maxY);
    
    if (newX !== rect.left || newY !== rect.top) {
      this.container.style.left = newX + 'px';
      this.container.style.top = newY + 'px';
      this.settings.position = { x: newX, y: newY };
      this.saveSettings();
    }
  }

  // 功能方法
  scrollToTop() {
    if (this.settings.enableAnimation) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }

  scrollToBottom() {
    if (this.settings.enableAnimation) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } else {
      window.scrollTo(0, document.body.scrollHeight);
    }
  }

  refreshPage() {
    location.reload();
  }

  goBack() {
    history.back();
  }

  goForward() {
    history.forward();
  }

  newTab() {
    chrome.runtime.sendMessage({ action: 'newTab' });
  }

  addBookmark() {
    chrome.runtime.sendMessage({ 
      action: 'addBookmark', 
      url: location.href, 
      title: document.title 
    });
  }

  openSettings() {
    chrome.runtime.sendMessage({ action: 'openOptions' });
  }

  // 主题切换
  changeTheme(themeName) {
    this.settings.theme = themeName;
    this.container.className = `floating-nav-container theme-${themeName}`;
    this.saveSettings();
  }

  // 应用自定义颜色
  applyCustomColor(color) {
    console.log('🎨 应用自定义颜色:', color);
    
    if (!this.container) {
      console.warn('⚠️ 容器不存在，无法应用自定义颜色');
      return;
    }
    
    // 生成悬停颜色（比原色稍深）
    const hoverColor = this.darkenColor(color);
    
    // 设置CSS变量
    this.container.style.setProperty('--custom-color', color);
    this.container.style.setProperty('--custom-color-hover', hoverColor);
    
    // 切换到自定义主题类
    this.container.className = `floating-nav-container theme-custom`;
    this.currentTheme = 'custom';
    this.settings.customColor = color;
    this.settings.theme = 'custom';
    
    this.saveSettings();
    console.log('✅ 自定义颜色已应用:', color);
  }
  
  // 应用自定义颜色样式（不改变主题设置，仅设置CSS变量）
  applyCustomColorStyles() {
    if (!this.container || !this.settings.customColor) {
      return;
    }
    
    console.log('🎨 应用自定义颜色样式:', this.settings.customColor);
    
    // 生成悬停颜色（比原色稍深）
    const hoverColor = this.darkenColor(this.settings.customColor);
    
    // 设置CSS变量
    this.container.style.setProperty('--custom-color', this.settings.customColor);
    this.container.style.setProperty('--custom-color-hover', hoverColor);
  }
  
  // 颜色加深函数（用于hover效果）
  darkenColor(color) {
    // 简单的颜色加深算法
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
    
    const darkerHex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    return `#${darkerHex}`;
  }

  // 完成欢迎设置，启动悬浮导航
  async completeWelcomeSetup() {
    console.log('🎉 用户完成欢迎设置，开始启动悬浮导航');
    
    // 更新欢迎完成标记
    this.settings.isWelcomeCompleted = true;
    await this.saveSettings();
    
    // 如果悬浮导航还没有初始化，现在创建它
    if (!this.container) {
      this.createFloatingNav();
      this.bindEvents();
      console.log('✅ 悬浮导航已启动！');
    }
  }

  // 更新设置
  updateSettings(newSettings) {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    console.log('🔄 设置已更新');
    console.log('🔧 新设置:', this.settings);
    
    // 检查是否只是功能按钮设置发生了变化
    const onlyButtonsChanged = newSettings.enabledButtons && 
      Object.keys(newSettings).length === 1 && 
      JSON.stringify(oldSettings.enabledButtons) !== JSON.stringify(newSettings.enabledButtons);
    
    // 检查是否只是样式设置发生了变化（大小、透明度）
    const onlyStyleChanged = (newSettings.buttonSize !== undefined || newSettings.buttonOpacity !== undefined) &&
      !newSettings.enabledButtons && !newSettings.theme && !newSettings.position;
    
    if (onlyButtonsChanged) {
      // 只重新创建功能按钮
      console.log('⚡ 仅更新功能按钮');
      this.recreateFunctionButtons();
    } else if (onlyStyleChanged) {
      // 只更新按钮样式
      console.log('🎨 仅更新按钮样式');
      this.applyButtonStyles();
      this.recreateFunctionButtons(); // 重新创建按钮以应用新的半径
    } else {
      // 完全重新创建导航界面
      console.log('🔄 完整重新创建导航界面');
      
      // 移除旧的导航界面
      if (this.container) {
        this.container.remove();
      }
      
      // 重新创建导航以应用新设置
      this.createFloatingNav();
      this.bindEvents();
    }
  }
}

// 初始化
let floatingNav;
let messageQueue = []; // 消息队列，用于缓存初始化前收到的消息

console.log('📦 Content Script 已加载');
console.log('📄 页面状态:', document.readyState);
console.log('🌐 页面URL:', window.location.href);

// 初始化悬浮导航实例
function initializeFloatingNav() {
  console.log('🚀 开始创建悬浮导航实例');
  floatingNav = new FloatingNavigation();
  
  // 处理队列中的消息
  if (messageQueue.length > 0) {
    console.log('📬 处理队列中的', messageQueue.length, '条消息');
    messageQueue.forEach(({ message, sender, sendResponse }) => {
      handleMessage(message, sender, sendResponse);
    });
    messageQueue = []; // 清空队列
  }
}

// 快速初始化悬浮导航
if (document.readyState === 'loading') {
  console.log('⏳ 页面正在加载，等待DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded触发，立即初始化...');
    initializeFloatingNav(); // 立即初始化，无延迟
  });
} else {
  console.log('✅ 页面已加载完成，立即初始化...');
  initializeFloatingNav(); // 立即初始化，无延迟
}

// 消息处理函数
function handleMessage(message, sender, sendResponse) {
  console.log('📨 处理消息:', message);
  
  if (!floatingNav) {
    console.warn('⚠️ 悬浮导航未初始化，消息将被忽略');
    return false;
  }
  
  switch (message.action) {
    case 'updateSettings':
      floatingNav.updateSettings(message.settings);
      break;
      
    case 'changeTheme':
      floatingNav.changeTheme(message.theme);
      break;
      
    case 'applyCustomColor':
      floatingNav.applyCustomColor(message.color);
      break;
      
    case 'completeWelcome':
      floatingNav.completeWelcomeSetup();
      break;
      
    // 处理来自popup的快捷操作
    case 'toggleNav':
      console.log('🎯 切换悬浮导航显示/隐藏');
      if (floatingNav.container) {
        const isVisible = floatingNav.container.style.display !== 'none';
        floatingNav.container.style.display = isVisible ? 'none' : 'block';
        sendResponse({ success: true, visible: !isVisible });
      }
      break;
      
    case 'scrollTop':
      console.log('🎯 滚动到页面顶部');
      floatingNav.scrollToTop();
      sendResponse({ success: true });
      break;
      
    case 'scrollBottom':
      console.log('🎯 滚动到页面底部');
      floatingNav.scrollToBottom();
      sendResponse({ success: true });
      break;
      
    case 'refresh':
      console.log('🎯 刷新页面');
      window.location.reload();
      sendResponse({ success: true });
      break;
      
    default:
      console.warn('⚠️ 未知的消息action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true; // 保持消息通道开放，支持异步响应
}

// 监听来自background和popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 收到消息:', message);
  
  // 如果悬浮导航未初始化，将消息加入队列
  if (!floatingNav) {
    console.log('🔄 悬浮导航未初始化，消息加入队列:', message.action);
    messageQueue.push({ message, sender, sendResponse });
    return true; // 保持消息通道开放
  }
  
  // 如果已初始化，直接处理消息
  return handleMessage(message, sender, sendResponse);
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  if (floatingNav) {
    floatingNav.destroy();
  }
});

// 页面隐藏时也清理（用户切换标签页或最小化窗口）
document.addEventListener('visibilitychange', () => {
  if (document.hidden && floatingNav) {
    // 页面被隐藏时，清除定时器，避免无效操作
    floatingNav.clearHideTimer();
  }
});
