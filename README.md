<div align="center">
	<a href="https://github.com/condorheroblog/admin-icon/">
		<img alt="Admin-icon Logo" width="192" src="https://github.com/user-attachments/assets/82362d21-6ff8-4af3-9e6a-dd2ad2bf5a9e">
	</a>
	<br />
	<h1>Admin Icon</h1>
	<br />
</div>

# admin-icon

> 基于 Iconify 技术，将项目中的 SVG 图标一键打包成 IconifyJSON 格式，支持按需加载与纯 CSS 双方案。

## 核心优势

| 特性         | 说明                                                                 |
|--------------|----------------------------------------------------------------------|
| 统一管理     | 全部图标集中在一个仓库，版本迭代与权限管理更简单。                   |
| 按需加载     | 构建时仅打包使用到的图标，零运行时依赖，体积最小化。                 |
| 组件化提示   | 配合 Iconify 插件，编辑器自动补全图标名，开发体验友好。              |
| 双模式输出   | 同时生成 IconifyJSON 与纯 CSS 两套产物，React / Vue / 原生 HTML 皆可使用。 |

---

## 快速开始

admin-icon 是一个示例项目，并没有发布到 npm，构建产物只是一个符合 [IconifyJSON](https://iconify.design/docs/types/iconify-json.html) 规范的仓库，仓库最终的构建产物和 [@iconify-json/ri](https://www.npmjs.com/package/@iconify-json/ri) 基本相同。

1. 克隆仓库

```bash
git clone git+https://github.com/condorheroblog/admin-icon.git
cd admin-icon
```

2. 放入图标

将设计稿中的 SVG 文件直接丢进 `src/svg/`（支持子目录，会自动按文件夹命名）。

3. 重命名包名

打开 `package.json`，把 `name` 改成你的私有 scope，例如 `@your-company/icon`。

4. 构建 & 发布

```bash
npm install
npm run build      # 生成 dist/ 目录（含 IconifyJSON 与 index.css）
npm publish        # 或发到公司内网 npm
```

---

## 使用方式

如果项目使用的是 Iconify 和 [unplugin-icons](https://github.com/unplugin/unplugin-icons) 就可以在项目按如下方式使用自己的图标。

```tsx
import Home from '~icons/admin-icon/home';

function App() {
  return (
    <>
      <Home style={{ fontSize: '2em', color: 'red' }} />
    </>
  )
}
```

## CSS 使用方式

除了结合 Iconify 使用，项目的构建产物还提供了一种更加通用的使用方式，在纯 CSS 引入，在 HTML 直接使用类名即可。

> 原理：请查看 Anthony Fu 的博客文章 [《聊聊纯 CSS 图标》](https://antfu.me/posts/icons-in-pure-css-zh)。总结：**在纯 CSS 中使用 SVG 作为图标，且支持单色和彩色**。

项目中构建的产物有一个 `index.css` 文件，你可以在项目中引入这个文件即可使用。

```css
import "admin-icon/dist/index.css"
```

在 HTML 中使用时，图标类名的格式为 `admin-icon-{图标名}`，例如 `admin-icon-home` 对应 `home.svg`。

```html
<i class="admin-icon-home" style="font-size:24px; color:#000;"></i>
```

## 其他资源参考

- [lobe-icons](https://github.com/proj-airi/lobe-icons#readme)
- [OpenTiny Icons](https://github.com/opentiny/icons)
- [@iconify-json/ri](https://www.npmjs.com/package/@iconify-json/ri)
- [Iconify Inspector](https://github.com/nekomeowww/iconify-inspector)
