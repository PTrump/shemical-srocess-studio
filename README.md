# Chemical Process Studio

面向化工类专业本科教学的轻量级化工流程仿真工作台。当前阶段实现核心仿真工作台：拖拽搭建流程、编辑设备参数、运行前端演示计算、查看物料/能量平衡与图表，并将流程保存到浏览器本地。

> **DEMO / SIMULATED DATA**
> 本项目不包含真实热力学计算引擎或后端服务。界面中的流量、温度、压力、热负荷等结果由简化的教学演示模型生成，仅用于交互演示，**不构成真实物理仿真或工程设计结果**。

## 技术栈

- React 19 + TypeScript + Vite
- `@xyflow/react` — 交互式 PFD 画布
- `echarts` / `echarts-for-react` — 结果图表（按需注册图表模块）
- `lucide-react` — 界面图标
- 浏览器 `localStorage` — 流程本地保存

## 启动

```bash
npm install
npm run dev
```

```bash
npm run lint
npm run build
```

## 已实现范围

- 设备库：Streams、Mixer、Heater、Cooler、Flash Drum、Separator、Pump，支持拖拽与单击添加。
- 设备图形：7 类设备采用本地伪 3D SVG 技术插画，统一金属材质、光照、法兰/接口细节，不依赖外部图片或图标包；后续可在单一组件入口替换为 Blender 渲染资源。
- 选中态：设备选中后显示青绿色光晕与四角定位标记；Mixer、Heater、Flash Drum 显示内部剖面/工况高亮，同时强调与其相连的物流管线。
- 画布：自定义工程设备节点、正交工程管线、物流标签、缩放/平移/适应画布、连接/选择/删除节点与物流。
- 属性检查器：随节点/物流选择切换，支持编辑进料工况、设备目标温度、压力、效率等；实时显示上游/下游连接与计算工况。
- 仿真结果：概要 KPI、物料平衡表、能量平衡表、温度/流量图表，底部面板可折叠。
- 操作：撤销/重做、保存到 `localStorage`、刷新恢复、运行演示计算、重置教学示例。
- 教学示例流程：`Feed A + Feed B → Mixer → Heater → Product`。

## 目录结构

```text
src/
  components/
    canvas/       # React Flow 画布、自定义节点/边、画布 API
    common/       # Toast 提示
    equipment/    # 设备库与设备工程图标
    layout/       # 顶部工具栏
    panels/       # 属性检查器与字段组件
    results/      # 底部结果面板与 ECharts 图表
  context/        # 画布仿真上下文
  data/           # 设备定义、教学示例、演示计算模型
  hooks/          # 流程状态/历史、Toast
  types/          # 流程、物流、仿真结果类型
  utils/          # 格式化、存储、节点/边工厂
```

## 本地存储

- Key：`chemical-process-studio.flowsheet.v1`
- 保存内容：流程节点、物流、节点位置与参数、保存时间。
- 页面刷新后自动恢复最近一次保存的流程；若数据无效则回退到教学示例。

## 演示模型说明

- 物料衡算按质量守恒传递进料流量与组成。
- 能量负荷使用 `Q = ṁ · Cp · ΔT` 估算，`Cp = 2.2 kJ/(kg·K)`。
- 泵功率按流量、压差与效率进行教学级估算。
- 循环物流仅做单次通过近似，界面会给出提示。

这些简化不适用于真实工艺设计。
