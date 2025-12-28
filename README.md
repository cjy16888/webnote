# WebNote - Chrome 网页标注插件

一款用于在网页上高亮文字和添加笔记的 Chrome 浏览器扩展。

## 功能特点

- **5种高亮颜色**：黄色、绿色、蓝色、粉色、紫色，半透明背景
- **悬浮工具栏**：选中文字后自动弹出颜色选择器
- **侧边栏笔记**：添加、编辑和管理每个高亮的笔记
- **悬浮提示**：鼠标悬停在高亮文字上时显示笔记内容
- **自动打开面板**：高亮后自动打开侧边栏并弹出编辑框（可配置）
- **定位闪烁**：点击侧边栏中的高亮项，页面会滚动到对应位置并闪烁提示
- **本地持久化**：所有高亮和笔记保存在浏览器本地存储中
- **自动恢复**：重新访问页面时自动恢复之前的高亮标注

## 安装方法

### 以开发者模式加载（推荐）

1. 下载或克隆此仓库
   ```bash
   git clone https://github.com/cjy16888/webnote.git
   ```

2. 打开 Chrome 浏览器，访问 `chrome://extensions/`

3. 开启右上角的 **开发者模式**

4. 点击 **加载已解压的扩展程序**

5. 选择 `webnote` 文件夹

6. WebNote 图标将出现在 Chrome 工具栏中

## 使用说明

### 高亮文字

1. 在任意网页上选中文字
2. 自动弹出包含5种颜色按钮的悬浮工具栏
3. 点击任意颜色即可高亮选中的文字

### 管理笔记

1. 点击工具栏中的 WebNote 图标打开侧边栏
2. 或者点击页面上的任意高亮文字打开侧边栏
3. 点击侧边栏中的高亮项可跳转到页面对应位置
4. 点击编辑按钮（✏️）添加或修改笔记
5. 按 `Ctrl+Enter` 保存，按 `Escape` 取消

### 设置选项

- **高亮时自动打开面板**：在侧边栏顶部可开关此选项，控制高亮后是否自动打开侧边栏

## 项目结构

```
webnote/
├── manifest.json              # 扩展配置文件 (Manifest V3)
├── background/
│   └── service-worker.js      # 后台服务工作线程
├── content/
│   ├── content.js             # 主内容脚本
│   ├── content.css            # 高亮和工具栏样式
│   └── highlight-manager.js   # 高亮创建/恢复管理器
├── sidepanel/
│   ├── sidepanel.html         # 侧边栏页面
│   ├── sidepanel.js           # 侧边栏逻辑
│   └── sidepanel.css          # 侧边栏样式
├── utils/
│   └── xpath.js               # XPath 工具函数
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 技术细节

- **Manifest 版本**：V3
- **存储方式**：`chrome.storage.local`（数据保存在本地设备）
- **位置追踪**：XPath + 文本上下文，确保高亮位置可靠恢复
- **权限要求**：`storage`、`activeTab`、`sidePanel`

## 许可证

MIT License
