/* eslint-disable no-console */

/*
 * 构建脚本：将 ./svg 目录下的所有 SVG 图标
 * 1. 清理、优化
 * 2. 生成对应的 CSS 类（单色图标使用 mask + currentColor，多色图标使用 background）
 * 3. 导出 JSON 索引与合并后的 CSS 文件
 * 4. 生成 Iconify 所需的 metadata.json、chars.json、info.json
 */

import type { IconSet, SVG } from "@iconify/tools";
import { execSync } from "node:child_process";
import fs from "node:fs";

import { join } from "node:path";
import { cleanupSVG, deOptimisePaths, importDirectory, runSVGO } from "@iconify/tools";
import { encodeSvgForCss } from "@iconify/utils/lib/svg/encode-svg-for-css";
import chalk from "chalk";

const packageJSON = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

/* 图标前缀常量 */
const ICON_PREFIX = packageJSON.name;
/* 输出目录 */
const DIST_DIR = "./dist";

/* 全局变量：图标集合实例 */
let iconSet: IconSet;

/*
 * 基础样式：所有以 .`${ICON_PREFIX}`- 开头的类都会获得默认的 inline-block 尺寸与对齐方式
 */
const baseCss = `[class*=${ICON_PREFIX}-] {height:1em;width:1em;display:inline-block;vertical-align:middle;}\n`;

/*
 * 存放每个图标生成的 CSS 规则，最后合并写入文件
 */
const iconStyles: string[] = [];

/**
 * 根据图标名称与 SVG 内容生成一条 CSS 规则
 * 单色图标（包含 currentColor）采用 mask 方案，支持通过 color 属性换色
 * 多色图标采用 background 方案，保留原始颜色
 */
function buildCssRule(name: string, svgData: string): string {
	// 判断是否为单色图标
	const isMono = svgData.includes("currentColor");
	// 将 SVG 编码为 DataURI，供 CSS 使用
	const uri = `url("data:image/svg+xml;utf8,${encodeSvgForCss(svgData)}")`;

	// 根据是否单色生成不同的 CSS 属性集合
	const rules = isMono
		? {
			"--v": uri, // 自定义变量，供 mask 引用
			"-webkit-mask": "var(--v) no-repeat",
			"mask": "var(--v) no-repeat",
			"-webkit-mask-size": "100% 100%",
			"mask-size": "100% 100%",
			"background-color": "currentColor", // 通过 color 控制图标颜色
		}
		: {
			"background": `${uri} no-repeat`,
			"background-size": "100% 100%",
			"background-color": "transparent",
		};

	// 将属性对象拼接成一行样式字符串
	const body = Object.entries(rules)
		.map(([k, v]) => `${k}:${v};`)
		.join("");

	// 返回完整的 CSS 类规则
	return `.${ICON_PREFIX}-${name}{${body}}`;
}

/**
 * 处理单个 SVG：生成 CSS 并缓存到 iconStyles 数组
 */
function processSvg(name: string, svg: SVG) {
	iconStyles.push(buildCssRule(name, svg.toMinifiedString()));
}

/**
 * 工具函数：确保目标目录存在，不存在则递归创建
 */
function ensureDir(dir: string) {
	if (!fs.existsSync(dir))
		fs.mkdirSync(dir, { recursive: true });
}

/**
 * 生成并写出 Iconify 所需的 metadata.json、chars.json、info.json
 */
function writeIconifyFiles(iconSet: IconSet, names: string[]) {
	/*
   * 生成并写出 Iconify 所需的 metadata.json
   */
	const metadata = {
		// 按文件夹自动分组，也可按需自定义
		categories: iconSet.categories || {},
	};
	fs.writeFileSync(join(DIST_DIR, "metadata.json"), JSON.stringify(metadata, null, 2));
	console.log(chalk.green(`✓ Written ${DIST_DIR}/metadata.json`));

	/*
   * 生成并写出 Iconify 所需的 chars.json（无字符映射）
   */
	fs.writeFileSync(join(DIST_DIR, "chars.json"), JSON.stringify({}, null, 2));
	console.log(chalk.green(`✓ Written ${DIST_DIR}/chars.json`));

	/*
   * 生成并写出 Iconify 所需的 info.json
   */
	const info = {
		prefix: ICON_PREFIX,
		name: "Admin Icon",
		total: names.length,
		version: packageJSON.version,
		author: {
			name: packageJSON.author?.name,
			url: packageJSON.author?.url,
		},
		license: {
			title: packageJSON.license || "MIT",
			spdx: packageJSON.license || "MIT",
		},
		samples: names.slice(0, 3), // 取前三个图标作为示例
		height: 24,
		category: "Admin Icons",
		tags: ["admin", "icon", "svg"],
		palette: false,
	};
	fs.writeFileSync(join(DIST_DIR, "info.json"), JSON.stringify(info, null, 2));
	console.log(chalk.green(`✓ Written ${DIST_DIR}/info.json`));
}

/**
 * 重命名文件扩展名
 * @param srcFile 原文件路径
 * @param targetFile 目标文件路径
 */
export function renameFileExt(srcFile: string, targetFile: string) {
	if (fs.existsSync(srcFile)) {
		fs.renameSync(srcFile, targetFile);
		console.log(chalk.green(`✓ Renamed ${srcFile} to ${targetFile}`));
	}
}

/**
 * 主流程：
 * 1. 准备输出目录
 * 2. 导入并遍历所有 SVG
 * 3. 清理、优化、生成 CSS
 * 4. 写出 JSON 索引与合并后的 CSS
 * 5. 写出 Iconify 所需的 metadata.json、chars.json、info.json
 */
async function main() {
	// 清空输出目录
	fs.rmSync(DIST_DIR, { recursive: true, force: true });
	// 确保输出目录存在
	ensureDir(DIST_DIR);

	/*
   * 从 ./svg 目录递归导入所有 SVG 文件
   * 图标前缀设为 ICON_PREFIX（class="${ICON_PREFIX}-xxxx"）
   */
	iconSet = await importDirectory(new URL("./svg", import.meta.url).pathname, {
		prefix: ICON_PREFIX,
		includeSubDirs: true,
		ignoreImportErrors: "warn",
	});

	/*
   * 遍历图标集合：清理、优化、生成样式
   */
	iconSet.forEach((name, type) => {
		// 只处理图标类型，忽略别名等其他类型
		if (type !== "icon")
			return;

		const svg = iconSet.toSVG(name);
		if (!svg) {
			// 无法获取 SVG 时移除该条目
			iconSet.remove(name);
			return;
		}

		try {
			// 1. 基础清理：移除无用元素与属性
			cleanupSVG(svg);

			// 2. 判断是否包含渐变，决定后续是否保留 <defs>
			const hasGradient = svg.toString().includes("<linearGradient");

			// 3. 运行 SVGO 插件链
			runSVGO(svg, {
				plugins: [
					"prefixIds", // 为 id 添加前缀，避免冲突
					{
						name: "removeDefs",
						fn: () => ({
							element: {
								enter: (node, parentNode) => {
									// 若存在渐变，保留 <defs>；否则移除空的 <defs>
									if (hasGradient)
										return;
									if (node.name === "defs") {
										parentNode.children = parentNode.children.filter((c: any) => c !== node);
									}
								},
							},
						}),
					},
				],
			});

			// 4. 反优化路径：保证兼容性，避免过度简化
			deOptimisePaths(svg);
		}
		catch (err) {
			// 优化失败时记录错误并移除该图标
			console.error(chalk.red("SVG optimization failed"), name, err);
			iconSet.remove(name);
			return;
		}

		// 将处理后的 SVG 重新写回图标集合
		iconSet.fromSVG(name, svg);
		// 生成对应的 CSS 规则
		processSvg(name, svg);
	});

	console.log(chalk.blue("> SVG import and processing completed\n"));

	/*
   * 写出 JSON 索引文件，供前端按需加载
   */
	const iconJSONData = iconSet.export();
	fs.writeFileSync(join(DIST_DIR, "icons.json"), JSON.stringify(iconJSONData, null, 2));
	console.log(chalk.green(`✓ Written ${DIST_DIR}/icons.json`));

	/*
   * 写出合并后的 CSS 文件
   */
	fs.writeFileSync(join(DIST_DIR, "index.css"), baseCss + iconStyles.join("\n"));
	console.log(chalk.green(`✓ Written ${DIST_DIR}/index.css`));

	/*
   * 统计图标数量
   */
	const names = Object.keys(iconJSONData.icons || {});

	// 生成 Iconify 所需的三个文件
	writeIconifyFiles(iconSet, names);

	console.log("\n");
	// 使用 tsc 编译 index.ts 到 dist 目录，格式为 ESM
	execSync("tsc --project build-tsconfig.json", { stdio: "inherit" });

	// 将生成的 index.js 重命名为 index.mjs
	const indexJsPath = join(DIST_DIR, "index.js");
	const indexMjsPath = join(DIST_DIR, "index.mjs");
	renameFileExt(indexJsPath, indexMjsPath);

	// 将生成的 index.d.ts 重命名为 index.d.mts
	const indexDtsPath = join(DIST_DIR, "index.d.ts");
	const indexDmtsPath = join(DIST_DIR, "index.d.mts");
	renameFileExt(indexDtsPath, indexDmtsPath);

	// 使用 tsc 编译 index.ts 到 dist 目录，格式为 CJS
	execSync("tsc --project build-tsconfig.json --module commonjs --moduleResolution node10", { stdio: "inherit" });
	// 将生成的 index.js 重命名为 index.cjs
	const indexCjsPath = join(DIST_DIR, "index.cjs");
	renameFileExt(indexJsPath, indexCjsPath);
	// 将生成的 index.d.ts 重命名为 index.d.cts
	const indexDctsPath = join(DIST_DIR, "index.d.cts");
	renameFileExt(indexDtsPath, indexDctsPath);

	console.log(chalk.blue(`> Generated ${names.length} icons`));
	console.log(chalk.blue("\n> Build completed!\n"));
}

// 执行主函数
main();
