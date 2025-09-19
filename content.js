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
    this.container.className = `floating-nav-container theme-${this.settings.theme} size-${this.settings.buttonSize}`;
    
    // 设置初始位置，确保在屏幕范围内
    const adjustedPosition = this.adjustPositionToScreen(this.settings.position);
    this.container.style.left = adjustedPosition.x + 'px';
    this.container.style.top = adjustedPosition.y + 'px';
    console.log('📍 设置位置:', adjustedPosition);
    console.log('📏 按钮大小:', this.settings.buttonSize);

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
    
    // 确保body存在再添加
    if (document.body) {
      document.body.appendChild(this.container);
      console.log('✅ 悬浮导航已添加到页面！');
    } else {
      console.error('❌ document.body不存在，无法添加悬浮导航');
      // 等待body加载
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          document.body.appendChild(this.container);
          console.log('✅ 悬浮导航已延迟添加到页面！');
        }
      });
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
      
      // 根据按钮大小调整半径
      let radius = 70; // 默认中号按钮半径
      if (this.settings.buttonSize === 'small') {
        radius = 55;
      } else if (this.settings.buttonSize === 'large') {
        radius = 85;
      }
      
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
    button.className = `floating-nav-button ${id} size-${this.settings.buttonSize}`;
    button.innerHTML = `
      <span class="button-icon">${icon}</span>
    `;
    button.title = title; // 保留悬停提示
    button.setAttribute('data-id', id);
    return button;
  }

  bindEvents() {
    // 主按钮点击事件
    this.mainButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleButtons();
    });

    // 拖拽事件
    this.mainButton.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // 左键
        this.startDrag(e);
      }
    });

    // 全局点击事件（隐藏按钮组）
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hideButtons();
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

  startDrag(e) {
    this.isDragging = true;
    this.dragOffset = {
      x: e.clientX - this.container.offsetLeft,
      y: e.clientY - this.container.offsetTop
    };

    const mouseMoveHandler = (e) => {
      if (!this.isDragging) return;
      
      const newX = e.clientX - this.dragOffset.x;
      const newY = e.clientY - this.dragOffset.y;
      
      // 边界检查
      const maxX = window.innerWidth - this.container.offsetWidth;
      const maxY = window.innerHeight - this.container.offsetHeight;
      
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      this.container.style.left = constrainedX + 'px';
      this.container.style.top = constrainedY + 'px';
    };

    const mouseUpHandler = () => {
      this.isDragging = false;
      this.settings.position = {
        x: parseInt(this.container.style.left),
        y: parseInt(this.container.style.top)
      };
      this.saveSettings();
      
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
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
    this.buttonGroup.style.display = 'block';
    this.container.classList.add('expanded');
    
    // 按钮展开动画
    const buttons = this.buttonGroup.querySelectorAll('.floating-nav-button');
    buttons.forEach((button, index) => {
      setTimeout(() => {
        button.classList.add('show');
      }, index * 50);
    });
  }

  hideButtons() {
    const buttons = this.buttonGroup.querySelectorAll('.floating-nav-button');
    buttons.forEach(button => button.classList.remove('show'));
    
    setTimeout(() => {
      this.buttonGroup.style.display = 'none';
      this.container.classList.remove('expanded');
    }, 200);
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
    
    if (onlyButtonsChanged) {
      // 只重新创建功能按钮
      console.log('⚡ 仅更新功能按钮');
      this.recreateFunctionButtons();
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

console.log('📦 Content Script 已加载');
console.log('📄 页面状态:', document.readyState);
console.log('🌐 页面URL:', window.location.href);

// 确保页面完全加载后再初始化
if (document.readyState === 'loading') {
  console.log('⏳ 页面正在加载，等待DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded触发，延迟1秒初始化...');
    setTimeout(() => {
      console.log('🚀 开始创建悬浮导航实例');
      floatingNav = new FloatingNavigation();
    }, 1000); // 延迟1秒确保页面稳定
  });
} else {
  console.log('✅ 页面已加载完成，延迟1秒初始化...');
  setTimeout(() => {
    console.log('🚀 开始创建悬浮导航实例');
    floatingNav = new FloatingNavigation();
  }, 1000);
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateSettings' && floatingNav) {
    floatingNav.updateSettings(message.settings);
  }
  if (message.action === 'changeTheme' && floatingNav) {
    floatingNav.changeTheme(message.theme);
  }
  if (message.action === 'completeWelcome' && floatingNav) {
    floatingNav.completeWelcomeSetup();
  }
});
