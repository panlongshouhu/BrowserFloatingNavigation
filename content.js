// 浮动导航类
class FloatingNavigation {
  constructor() {
    this.isInitialized = false;
    this.isDragging = false;
    this.currentTheme = 'default';
    this.lastHoverState = false; // 跟踪鼠标悬停状态变化
    this.isPopupOpen = false; // 跟踪popup状态
    this.hideTimer = null; // 延迟隐藏计时器
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
      isWelcomeCompleted: false, // 重要：首次安装时默认为false
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
    
    // 直接创建悬浮导航，不再等待欢迎设置完成
    // 欢迎页面现在只是一个可选的预览步骤
    console.log('🎯 安装后立即显示悬浮导航，欢迎页面仅作预览');
    
    // 创建悬浮导航
    this.createFloatingNav();
    console.log('🎨 悬浮导航UI已创建');
    
    // 绑定事件
    this.bindEvents();
    console.log('🎯 事件绑定完成');
    
    // 添加页面可见性监听，实现单实例效果
    this.bindVisibilityEvents();
    console.log('👁️ 页面可见性监听已绑定');
    
    // 添加设置变化监听，确保多标签页同步
    this.bindStorageChangeListener();
    console.log('💾 设置变化监听已绑定');
    
    // 初始检查页面可见性
    this.handleVisibilityChange();
    
    this.isInitialized = true;
    console.log('✅ 悬浮导航初始化完成！');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['floatingNavSettings']);
      if (result.floatingNavSettings) {
        this.settings = { ...this.settings, ...result.floatingNavSettings };
        
        // 清理和转换可能的旧格式设置
        let needsSave = false;
        
        // 处理buttonSize旧格式
        if (typeof this.settings.buttonSize === 'string') {
          switch (this.settings.buttonSize.toLowerCase()) {
            case 'small': this.settings.buttonSize = 60; break;
            case 'medium': this.settings.buttonSize = 80; break;
            case 'large': this.settings.buttonSize = 100; break;
            default: this.settings.buttonSize = 80;
          }
          needsSave = true;
          console.log('🔄 loadSettings中转换buttonSize格式:', this.settings.buttonSize);
        }
        
        // 确保buttonSize是有效数字
        if (!this.settings.buttonSize || isNaN(this.settings.buttonSize)) {
          this.settings.buttonSize = 80;
          needsSave = true;
        }
        
        // 确保buttonOpacity是有效数字
        if (!this.settings.buttonOpacity || isNaN(this.settings.buttonOpacity)) {
          this.settings.buttonOpacity = 90;
          needsSave = true;
        }
        
        // 确保isWelcomeCompleted有明确的布尔值
        if (typeof this.settings.isWelcomeCompleted !== 'boolean') {
          this.settings.isWelcomeCompleted = false;
          needsSave = true;
        }
        
        // 如果进行了数据清理，保存更新的设置
        if (needsSave) {
          console.log('💾 保存清理后的设置');
          await this.saveSettings();
        }
      }
    } catch (error) {
      console.log('设置加载失败，使用默认设置:', error);
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

    // 在按钮创建后立即应用样式
    this.applyButtonStyles();
    console.log('🎨 样式已应用到主按钮');
    
    // 如果是自定义颜色主题，应用自定义颜色
    if (this.settings.theme === 'custom' && this.settings.customColor) {
      this.applyCustomColorStyles();
      console.log('🌈 自定义颜色已应用');
    }

    // 创建展开的按钮组
    this.buttonGroup = document.createElement('div');
    this.buttonGroup.className = 'floating-nav-buttons';
    this.buttonGroup.style.display = 'none';

    // 创建功能按钮
    this.createFunctionButtons();
    console.log('🔧 功能按钮已创建');
    
    this.container.appendChild(this.buttonGroup);
    
    // 在所有按钮创建后再次确保样式正确应用
    setTimeout(() => {
      this.applyButtonStyles();
      console.log('🎨 延迟确保所有按钮样式正确应用');
    }, 10);
    
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
      { id: 'refresh', key: 'refresh', icon: '⟲', label: '刷新页面', action: () => this.refreshPage() },
      // 新增功能按钮
      { id: 'copy-link', key: 'copyLink', icon: '📋', label: '复制链接', action: () => this.copyCurrentLink() },
      { id: 'fullscreen', key: 'fullscreen', icon: '🔍', label: '全屏切换', action: () => this.toggleFullscreen() },
      { id: 'close-tab', key: 'closeTab', icon: '✖', label: '关闭标签页', action: () => this.closeCurrentTab() }
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
    
    // 确保按钮大小和透明度是有效数字（双重保险）
    let buttonSize = this.settings.buttonSize;
    let buttonOpacity = this.settings.buttonOpacity;
    let needsSave = false;
    
    // 最后的安全检查，防止任何未捕获的NaN值
    if (!buttonSize || isNaN(buttonSize) || typeof buttonSize === 'string') {
      console.warn('⚠️ applyButtonStyles中发现无效的buttonSize:', buttonSize, '使用默认值80');
      buttonSize = 80;
      this.settings.buttonSize = buttonSize;
      needsSave = true;
    }
    
    if (!buttonOpacity || isNaN(buttonOpacity) || typeof buttonOpacity === 'string') {
      console.warn('⚠️ applyButtonStyles中发现无效的buttonOpacity:', buttonOpacity, '使用默认值90');
      buttonOpacity = 90;
      this.settings.buttonOpacity = buttonOpacity;
      needsSave = true;
    }
    
    const sizePercent = Math.max(0.3, Math.min(1.5, buttonSize / 100)); // 限制在30%-150%之间
    const opacityPercent = Math.max(0.1, Math.min(1, buttonOpacity / 100)); // 限制在10%-100%之间
    
    console.log('🔧 设置值处理结果:', {
      原始buttonSize: this.settings.buttonSize,
      处理后buttonSize: buttonSize,
      原始buttonOpacity: this.settings.buttonOpacity, 
      处理后buttonOpacity: buttonOpacity,
      最终sizePercent: sizePercent,
      最终opacityPercent: opacityPercent
    });
    
    // 设置CSS变量，用于动态控制按钮大小和透明度
    this.container.style.setProperty('--button-size-scale', sizePercent);
    this.container.style.setProperty('--button-opacity', opacityPercent);
    
    // 强制触发样式重新计算，确保按钮立即应用新样式
    this.container.offsetHeight; // 读取样式属性触发重新计算
    
    // 如果主按钮存在，直接设置其样式确保可见
    if (this.mainButton) {
      const mainButtonStyle = window.getComputedStyle(this.mainButton);
      console.log('🎯 主按钮实时样式:', {
        display: mainButtonStyle.display,
        width: mainButtonStyle.width,
        height: mainButtonStyle.height,
        opacity: mainButtonStyle.opacity,
        visibility: mainButtonStyle.visibility
      });
      
      // 如果检测到主按钮不可见，强制设置为可见
      if (mainButtonStyle.width === '0px' || mainButtonStyle.height === '0px' || mainButtonStyle.opacity === '0') {
        console.warn('⚠️ 检测到主按钮不可见，强制应用样式');
        this.mainButton.style.width = `calc(var(--main-button-size) * ${sizePercent})`;
        this.mainButton.style.height = `calc(var(--main-button-size) * ${sizePercent})`;
        this.mainButton.style.opacity = opacityPercent;
        this.mainButton.style.display = 'flex';
        this.mainButton.style.visibility = 'visible';
      }
    }
    
    console.log('🎨 应用按钮样式 - 大小:', sizePercent, '透明度:', opacityPercent);
    console.log('📊 原始设置值 - buttonSize:', buttonSize, 'buttonOpacity:', buttonOpacity);
    
    // 验证CSS变量是否正确设置
    const actualSizeScale = this.container.style.getPropertyValue('--button-size-scale');
    const actualOpacity = this.container.style.getPropertyValue('--button-opacity');
    console.log('✅ CSS变量验证 - size-scale:', actualSizeScale, 'opacity:', actualOpacity);
    
    // 如果在applyButtonStyles中发现了需要修复的值，保存设置
    if (needsSave) {
      console.log('💾 保存applyButtonStyles中修复的设置');
      this.saveSettings();
    }
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
    this.lastRectUpdate = 0;
    this.cachedMainButtonRect = null;
    this.globalMouseMoveHandler = (e) => {
      if (this.isDragging) return;
      
      // 节流：每20ms检查一次，提高响应精度
      const now = Date.now();
      if (now - this.lastMouseCheck < 20) return;
      this.lastMouseCheck = now;
      
      // 每100ms更新一次缓存的主按钮位置信息，减少频繁的DOM查询
      if (now - this.lastRectUpdate > 100) {
        this.cachedMainButtonRect = this.mainButton?.getBoundingClientRect();
        this.lastRectUpdate = now;
      }
      
      const isOverFloatingNav = this.isMouseOverFloatingNav(e.clientX, e.clientY);
      
      // 添加状态变化检测，减少不必要的日志
      if (isOverFloatingNav !== this.lastHoverState) {
        this.lastHoverState = isOverFloatingNav;
        console.log('🖱️ 鼠标状态变化:', isOverFloatingNav ? '进入悬浮导航区域' : '离开悬浮导航区域');
      }
      
      if (isOverFloatingNav) {
        this.clearHideTimer();
        this.showButtons();
      } else if (this.container.classList.contains('expanded')) {
        this.scheduleHideButtons();
      }
    };
    
    // 添加全局鼠标移动监听
    document.addEventListener('mousemove', this.globalMouseMoveHandler);

    // 拖拽事件 - 主按钮直接绑定
    this.mainButton.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // 左键
        console.log('🖱️ 主按钮mousedown事件触发，目标元素:', e.target.className);
        e.preventDefault();
        e.stopPropagation();
        this.startDrag(e);
      }
    });
    
    // 拖拽事件 - 容器级别事件委托（备用方案）
    this.container.addEventListener('mousedown', (e) => {
      if (e.button === 0 && e.target.closest('.floating-nav-button.main')) {
        console.log('🖱️ 容器级别mousedown事件触发，目标元素:', e.target.className);
        // 如果主按钮事件没有触发，这里作为备用
        if (!this.isDragging) {
          e.preventDefault();
          e.stopPropagation();
          this.startDrag(e);
        }
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
    // 使用缓存的主按钮位置信息，如果没有则实时获取
    const mainButtonRect = this.cachedMainButtonRect || this.mainButton?.getBoundingClientRect();
    if (!mainButtonRect) return false;
    
    // 动态计算边距容错，基于按钮大小
    const buttonSize = Math.max(mainButtonRect.width, mainButtonRect.height);
    const dynamicMargin = Math.max(15, buttonSize * 0.2); // 最少15px或按钮大小的20%
    
    // 检查主按钮区域 - 使用主按钮的实际位置而不是容器位置
    const expandedMainButtonRect = {
      left: mainButtonRect.left - dynamicMargin,
      right: mainButtonRect.right + dynamicMargin,
      top: mainButtonRect.top - dynamicMargin,
      bottom: mainButtonRect.bottom + dynamicMargin
    };
    
    // 使用圆形检测，更符合按钮的视觉形状
    const centerX = (mainButtonRect.left + mainButtonRect.right) / 2;
    const centerY = (mainButtonRect.top + mainButtonRect.bottom) / 2;
    const radius = buttonSize / 2 + dynamicMargin;
    const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
    
    if (distance <= radius) {
      return true;
    }
    
    // 如果菜单展开，检查功能按钮区域
    if (this.container.classList.contains('expanded')) {
      const buttons = this.buttonGroup.querySelectorAll('.floating-nav-button');
      for (const button of buttons) {
        const buttonRect = button.getBoundingClientRect();
        const functionButtonSize = Math.max(buttonRect.width, buttonRect.height);
        const functionMargin = Math.max(12, functionButtonSize * 0.15); // 功能按钮稍小的容错
        
        // 同样使用圆形检测功能按钮
        const btnCenterX = (buttonRect.left + buttonRect.right) / 2;
        const btnCenterY = (buttonRect.top + buttonRect.bottom) / 2;
        const btnRadius = functionButtonSize / 2 + functionMargin;
        const btnDistance = Math.sqrt(Math.pow(mouseX - btnCenterX, 2) + Math.pow(mouseY - btnCenterY, 2));
        
        if (btnDistance <= btnRadius) {
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
  
  // 重置位置缓存（在按钮移动后调用）
  resetPositionCache() {
    this.cachedMainButtonRect = null;
    this.lastRectUpdate = 0;
  }
  
  // 安排延迟隐藏菜单
  scheduleHideButtons() {
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => {
      this.hideButtons();
      this.hideTimer = null;
    }, 20); // 50ms延迟，快速响应鼠标移出
  }

  startDrag(e) {
    console.log('🚀 startDrag方法被调用，事件类型:', e.type, '鼠标坐标:', e.clientX, e.clientY);
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
      
      // 重置位置缓存，因为按钮位置已改变
      this.resetPositionCache();
      
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
      }, index * 10); // 从50ms减少到10ms，更快的展开
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

  // 新增功能方法
  copyCurrentLink() {
    const currentUrl = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
      // 使用现代 Clipboard API
      navigator.clipboard.writeText(currentUrl).then(() => {
        console.log('📋 链接已复制到剪贴板:', currentUrl);
        this.showNotification('链接已复制到剪贴板', 'success');
      }).catch(err => {
        console.error('复制失败:', err);
        this.fallbackCopyTextToClipboard(currentUrl);
      });
    } else {
      // 降级到旧版本的复制方式
      this.fallbackCopyTextToClipboard(currentUrl);
    }
  }

  // 降级复制方法
  fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('📋 链接已通过降级方式复制:', text);
        this.showNotification('链接已复制到剪贴板', 'success');
      } else {
        this.showNotification('复制失败，请手动复制', 'error');
      }
    } catch (err) {
      console.error('降级复制也失败:', err);
      this.showNotification('复制失败，请手动复制', 'error');
    }
    
    document.body.removeChild(textArea);
  }

  toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        // 进入全屏
        document.documentElement.requestFullscreen().then(() => {
          console.log('🔍 已进入全屏模式');
          this.showNotification('已进入全屏模式', 'success');
        }).catch(err => {
          console.error('进入全屏失败:', err);
          this.showNotification('全屏模式不支持', 'error');
        });
      } else {
        // 退出全屏
        document.exitFullscreen().then(() => {
          console.log('🔍 已退出全屏模式');
          this.showNotification('已退出全屏模式', 'success');
        }).catch(err => {
          console.error('退出全屏失败:', err);
        });
      }
    } catch (err) {
      console.error('全屏切换失败:', err);
      this.showNotification('浏览器不支持全屏功能', 'error');
    }
  }

  closeCurrentTab() {
    try {
      // 通过background script关闭标签页
      chrome.runtime.sendMessage({ action: 'closeTab' }, (response) => {
        if (response && response.success) {
          console.log('✖ 标签页关闭请求已发送');
        } else {
          // 如果通过扩展API失败，尝试使用window.close()
          window.close();
        }
      });
    } catch (err) {
      console.error('关闭标签页失败:', err);
      // 最后尝试使用window.close()
      if (window.history.length <= 1) {
        window.close();
      } else {
        this.showNotification('无法关闭此标签页', 'error');
      }
    }
  }


  // 绑定页面可见性事件，实现单实例效果
  bindVisibilityEvents() {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
    
    // 监听窗口焦点变化
    window.addEventListener('focus', () => {
      console.log('🎯 窗口获得焦点');
      this.handleVisibilityChange();
    });
    
    window.addEventListener('blur', () => {
      console.log('🎯 窗口失去焦点');
      this.handleVisibilityChange();
    });
    
  }

  // 绑定设置变化监听器，确保多标签页同步
  bindStorageChangeListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.floatingNavSettings) {
        console.log('💾 检测到设置变化:', changes.floatingNavSettings);
        this.handleStorageChange(changes.floatingNavSettings);
      }
    });
  }

  // 处理设置变化
  async handleStorageChange(change) {
    try {
      const newSettings = change.newValue;
      const oldSettings = change.oldValue || {};
      
      console.log('📋 设置变化详情:', {
        old: oldSettings,
        new: newSettings
      });
      
      // 检查主题是否变化
      if (newSettings.theme !== oldSettings.theme) {
        console.log('🎨 主题变化:', oldSettings.theme, '->', newSettings.theme);
        this.settings.theme = newSettings.theme;
        this.changeTheme(newSettings.theme);
      }
      
      // 检查自定义颜色是否变化
      if (newSettings.customColor !== oldSettings.customColor) {
        console.log('🌈 自定义颜色变化:', oldSettings.customColor, '->', newSettings.customColor);
        this.settings.customColor = newSettings.customColor;
        this.applyCustomColor(newSettings.customColor);
      }
      
      // 检查按钮大小是否变化
      if (newSettings.buttonSize !== oldSettings.buttonSize) {
        console.log('📏 按钮大小变化:', oldSettings.buttonSize, '->', newSettings.buttonSize);
        this.settings.buttonSize = newSettings.buttonSize;
        this.applyButtonStyles();
      }
      
      // 检查按钮透明度是否变化
      if (newSettings.buttonOpacity !== oldSettings.buttonOpacity) {
        console.log('👻 按钮透明度变化:', oldSettings.buttonOpacity, '->', newSettings.buttonOpacity);
        this.settings.buttonOpacity = newSettings.buttonOpacity;
        this.applyButtonStyles();
      }
      
      // 检查启用按钮是否变化
      if (JSON.stringify(newSettings.enabledButtons) !== JSON.stringify(oldSettings.enabledButtons)) {
        console.log('🔘 启用按钮变化');
        this.settings.enabledButtons = newSettings.enabledButtons;
        this.updateFunctionButtons();
      }
      
      // 检查位置是否变化（从设置页面调整）
      if (newSettings.position && JSON.stringify(newSettings.position) !== JSON.stringify(oldSettings.position)) {
        console.log('📍 位置变化:', oldSettings.position, '->', newSettings.position);
        this.settings.position = newSettings.position;
        this.updatePosition();
      }
      
    } catch (error) {
      console.error('❌ 处理设置变化失败:', error);
    }
  }

  // 更新悬浮按钮位置
  updatePosition() {
    if (this.container && this.settings.position) {
      this.container.style.left = `${this.settings.position.x}px`;
      this.container.style.top = `${this.settings.position.y}px`;
      console.log('📍 位置已更新到:', this.settings.position);
    }
  }

  // 处理页面可见性变化
  handleVisibilityChange() {
    const isVisible = document.visibilityState === 'visible';
    const hasFocus = document.hasFocus();
    const shouldShow = isVisible && hasFocus;
    
    console.log('👁️ 页面可见性检查:', {
      visibilityState: document.visibilityState,
      hasFocus: hasFocus,
      shouldShow: shouldShow,
      isPopupOpen: this.isPopupOpen
    });
    
    if (this.container) {
      if (shouldShow || this.isPopupOpen) {
        // 如果页面可见或popup打开，显示悬浮按钮
        this.showFloatingNavWithDelay();
      } else {
        // 延迟隐藏，给popup打开时间
        this.scheduleHideFloatingNav();
      }
    }
  }

  // 处理标签页激活状态
  handleTabActivation(isActive) {
    console.log('📋 标签页激活状态变化:', isActive);
    if (this.container) {
      if (isActive) {
        this.showFloatingNav();
      } else {
        this.hideFloatingNav();
      }
    }
  }

  // 显示悬浮导航（带延迟清除）
  showFloatingNavWithDelay() {
    // 清除隐藏计时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.showFloatingNav();
  }

  // 延迟隐藏悬浮导航
  scheduleHideFloatingNav() {
    // 清除之前的计时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    
    // 延迟500ms隐藏，给popup打开时间
    this.hideTimer = setTimeout(() => {
      if (!this.isPopupOpen) {
        this.hideFloatingNav();
      }
      this.hideTimer = null;
    }, 500);
  }

  // 显示悬浮导航
  showFloatingNav() {
    if (this.container) {
      this.container.style.display = 'block';
      this.container.style.opacity = '1';
      this.container.style.visibility = 'visible';
      this.container.style.pointerEvents = 'auto';
      console.log('👁️ 悬浮导航已显示');
    }
  }

  // 隐藏悬浮导航
  hideFloatingNav() {
    if (this.container && !this.isPopupOpen) {
      this.container.style.display = 'none';
      this.container.style.opacity = '0';
      this.container.style.visibility = 'hidden';
      this.container.style.pointerEvents = 'none';
      console.log('👁️ 悬浮导航已隐藏');
    }
  }

  // 显示通知方法
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `floating-nav-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10002;
      transform: translateX(300px);
      opacity: 0;
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 10);
    
    // 3秒后自动消失
    setTimeout(() => {
      notification.style.transform = 'translateX(300px)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
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

  // 完成欢迎预览，仅标记状态（悬浮导航已在安装后立即显示）
  async completeWelcomeSetup() {
    console.log('🎉 用户完成欢迎预览，标记欢迎状态');
    console.log('📋 当前状态:', {
      isWelcomeCompleted: this.settings.isWelcomeCompleted,
      containerExists: !!this.container,
      isInitialized: this.isInitialized
    });
    
    // 更新欢迎完成标记（仅作为状态记录，不影响悬浮导航显示）
    this.settings.isWelcomeCompleted = true;
    await this.saveSettings();
    console.log('💾 欢迎状态已标记完成并保存');
    
    // 由于悬浮导航已在安装后立即创建，这里只需确认状态
    if (this.container && this.mainButton) {
      console.log('✅ 悬浮导航运行正常，欢迎预览完成');
    } else {
      console.warn('⚠️ 悬浮导航未找到，可能存在初始化问题');
      // 如果somehow悬浮导航不存在，重新初始化
      await this.init();
    }
  }

  // 调试用：强制重新初始化悬浮导航
  forceReinitialize() {
    console.log('🔄 强制重新初始化悬浮导航');
    
    // 移除现有容器
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    
    // 重新创建
    this.createFloatingNav();
    this.bindEvents();
    
    // 应用样式
    setTimeout(() => {
      this.applyButtonStyles();
      console.log('✅ 强制重新初始化完成');
    }, 50);
  }

  // 调试用：诊断第一次安装问题
  diagnosisFirstInstallIssue() {
    console.log('🔍 开始诊断第一次安装问题...');
    
    const diagnosis = {
      floatingNavExists: !!this,
      isInitialized: this.isInitialized,
      containerExists: !!this.container,
      containerInDOM: false,
      containerVisible: false,
      settings: this.settings,
      currentUrl: window.location.href,
      documentReady: document.readyState,
      bodyExists: !!document.body
    };
    
    if (this.container) {
      diagnosis.containerInDOM = document.body.contains(this.container);
      const computedStyle = window.getComputedStyle(this.container);
      diagnosis.containerVisible = computedStyle.display !== 'none' && 
                                  computedStyle.visibility !== 'hidden' && 
                                  computedStyle.opacity !== '0';
      diagnosis.containerStyle = {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        width: computedStyle.width,
        height: computedStyle.height,
        position: computedStyle.position,
        left: computedStyle.left,
        top: computedStyle.top,
        zIndex: computedStyle.zIndex
      };
      
      if (this.mainButton) {
        const buttonStyle = window.getComputedStyle(this.mainButton);
        diagnosis.mainButtonStyle = {
          display: buttonStyle.display,
          visibility: buttonStyle.visibility,
          opacity: buttonStyle.opacity,
          width: buttonStyle.width,
          height: buttonStyle.height
        };
      }
    }
    
    console.log('🔍 诊断结果:', diagnosis);
    
    // 给出建议
    const suggestions = [];
    if (!diagnosis.isInitialized) {
      suggestions.push('FloatingNavigation未初始化，可能是构造函数执行失败');
    }
    if (!diagnosis.containerExists) {
      suggestions.push('容器不存在，可能是createFloatingNav()未被调用或执行失败');
    }
    if (diagnosis.containerExists && !diagnosis.containerInDOM) {
      suggestions.push('容器已创建但未添加到DOM，可能是document.body不可用');
    }
    if (diagnosis.containerExists && diagnosis.containerInDOM && !diagnosis.containerVisible) {
      suggestions.push('容器在DOM中但不可见，可能是样式问题(display:none, opacity:0等)');
    }
    if (!diagnosis.settings?.isWelcomeCompleted) {
      suggestions.push('欢迎设置未完成，这是正常的首次安装状态');
    }
    
    if (suggestions.length > 0) {
      console.log('💡 诊断建议:', suggestions);
    } else {
      console.log('✅ 未发现明显问题，悬浮导航应该正常显示');
    }
    
    return diagnosis;
  }

  // 调试用：修复设置格式问题
  async fixSettingsFormat() {
    console.log('🔧 开始修复设置格式...');
    console.log('🔍 修复前的设置:', this.settings);
    
    let needsSave = false;
    
    // 修复buttonSize格式
    if (typeof this.settings.buttonSize === 'string') {
      switch (this.settings.buttonSize.toLowerCase()) {
        case 'small': this.settings.buttonSize = 60; break;
        case 'medium': this.settings.buttonSize = 80; break;
        case 'large': this.settings.buttonSize = 100; break;
        default: this.settings.buttonSize = 80;
      }
      needsSave = true;
      console.log('🔄 修复buttonSize:', this.settings.buttonSize);
    }
    
    // 修复buttonOpacity格式
    if (typeof this.settings.buttonOpacity === 'string' || !this.settings.buttonOpacity || isNaN(this.settings.buttonOpacity)) {
      this.settings.buttonOpacity = 90;
      needsSave = true;
      console.log('🔄 修复buttonOpacity:', this.settings.buttonOpacity);
    }
    
    // 修复isWelcomeCompleted格式
    if (typeof this.settings.isWelcomeCompleted !== 'boolean') {
      this.settings.isWelcomeCompleted = true; // 如果用户在调用这个方法，说明已经完成设置
      needsSave = true;
      console.log('🔄 修复isWelcomeCompleted:', this.settings.isWelcomeCompleted);
    }
    
    if (needsSave) {
      await this.saveSettings();
      console.log('💾 设置格式修复完成并已保存');
      
      // 重新应用样式
      this.applyButtonStyles();
      console.log('🎨 样式已重新应用');
    } else {
      console.log('✅ 设置格式无需修复');
    }
    
    console.log('🔍 修复后的设置:', this.settings);
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
      
    case 'forceReinitialize':
      floatingNav.forceReinitialize();
      sendResponse({ success: true, message: '强制重新初始化完成' });
      break;
      
    case 'diagnosis':
      const diagnosisResult = floatingNav.diagnosisFirstInstallIssue();
      sendResponse({ success: true, diagnosis: diagnosisResult });
      break;
      
    case 'fixSettingsFormat':
      console.log('🔧 手动修复设置格式...');
      floatingNav.fixSettingsFormat();
      sendResponse({ success: true, message: '设置格式已修复' });
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
      
    case 'ping':
      console.log('🏓 收到ping消息，回复pong');
      sendResponse({ 
        success: true, 
        message: 'pong',
        floatingNavExists: !!floatingNav?.container,
        isInitialized: floatingNav?.isInitialized || false,
        currentUrl: window.location.href
      });
      break;
      
    case 'getStatus':
      console.log('📊 获取悬浮导航状态');
      const status = {
        initialized: !!floatingNav,
        containerExists: !!floatingNav?.container,
        containerVisible: false,
        settings: floatingNav?.settings || null,
        currentUrl: window.location.href
      };
      
      if (floatingNav?.container) {
        const computedStyle = window.getComputedStyle(floatingNav.container);
        status.containerVisible = computedStyle.display !== 'none' && 
                                 computedStyle.visibility !== 'hidden' && 
                                 computedStyle.opacity !== '0';
        status.containerInDOM = document.body.contains(floatingNav.container);
      }
      
      console.log('📊 状态检查结果:', status);
      sendResponse({ success: true, status: status });
      break;
      
    // 处理标签页激活状态变化
    case 'tabActivated':
      console.log('📋 收到标签页激活消息:', message.tabId, '当前是否激活:', message.isActive);
      if (floatingNav && floatingNav.handleTabActivation) {
        floatingNav.handleTabActivation(message.isActive);
      }
      sendResponse({ success: true });
      break;
      
    // 处理popup状态变化
    case 'popupOpened':
      console.log('📋 Popup已打开');
      if (floatingNav) {
        floatingNav.isPopupOpen = true;
        floatingNav.showFloatingNavWithDelay(); // 确保popup打开时悬浮按钮可见
      }
      sendResponse({ success: true });
      break;
      
    case 'popupClosed':
      console.log('📋 Popup已关闭');
      if (floatingNav) {
        floatingNav.isPopupOpen = false;
        // 检查是否需要隐藏悬浮按钮
        floatingNav.handleVisibilityChange();
      }
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
