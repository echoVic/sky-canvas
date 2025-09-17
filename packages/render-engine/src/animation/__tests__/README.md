# Animation 模块测试文件整理方案

## 当前问题

当前动画模块的测试文件分散在多个子目录中，存在以下问题：

1. **测试文件分散**：测试文件分布在 9 个不同的 `__tests__` 目录中
2. **重复测试文件**：存在同名但内容不同的测试文件（如 `LinearPath.test.ts`、`EasingFunctions.test.ts`）
3. **维护困难**：测试文件分散导致难以统一管理和维护
4. **结构不清晰**：无法快速了解整个模块的测试覆盖情况

## 整理方案

### 方案一：集中式测试目录（推荐）

将所有测试文件统一移动到 `src/animation/__tests__` 目录下，按功能模块分类：

```
src/animation/__tests__/
├── setup.ts                           # 测试配置
├── core/                              # 核心功能测试
│   ├── AnimationManager.test.ts
│   └── BaseAnimation.test.ts
├── animations/                        # 动画类型测试
│   ├── PropertyAnimation.test.ts
│   ├── MultiPropertyAnimation.test.ts
│   └── PathAnimation.test.ts
├── easing/                           # 缓动函数测试
│   └── EasingFunctions.test.ts
├── paths/                            # 路径测试
│   ├── LinearPath.test.ts
│   └── PathFactory.test.ts
├── particles/                        # 粒子系统测试
│   ├── Particle.test.ts
│   ├── ParticleFactory.test.ts
│   └── ParticleSystem.test.ts
├── groups/                           # 动画组测试
│   └── AnimationGroup.test.ts
├── timeline/                         # 时间轴测试
│   └── Timeline.test.ts
└── examples/                         # 示例测试
    └── AnimationExamples.test.ts
```

### 方案二：保持分散但规范化

保持当前的分散结构，但统一命名和组织方式，移除重复文件。

## 重复文件处理

### 需要合并的重复文件：

1. **LinearPath.test.ts**
   - 主目录版本：396行，更全面的测试
   - paths目录版本：275行，基础测试
   - **建议**：合并两个文件的测试用例，保留在 `paths/` 目录下

2. **EasingFunctions.test.ts**
   - 主目录版本：249行
   - easing目录版本：334行，更完整的测试
   - **建议**：保留 easing 目录下的版本，删除主目录版本

## 实施步骤

### 第一阶段：分析和备份
1. 分析所有测试文件的内容和覆盖范围
2. 备份当前测试文件
3. 识别重复和冲突的测试用例

### 第二阶段：合并重复文件
1. 合并 LinearPath.test.ts 的测试用例
2. 选择保留更完整的 EasingFunctions.test.ts
3. 检查其他潜在的重复文件

### 第三阶段：重新组织
1. 根据选定方案重新组织测试文件
2. 更新导入路径
3. 更新测试配置

### 第四阶段：验证
1. 运行所有测试确保功能正常
2. 检查测试覆盖率
3. 更新文档

## 推荐实施方案

**推荐采用方案一（集中式测试目录）**，理由：

1. **统一管理**：所有测试文件在一个目录下，便于管理
2. **清晰结构**：按功能模块分类，结构清晰
3. **避免重复**：统一位置避免重复文件
4. **便于维护**：测试配置和工具函数可以共享
5. **符合惯例**：大多数项目采用这种结构

## 注意事项

1. **导入路径**：移动文件后需要更新相对导入路径
2. **测试配置**：确保 vitest 配置正确识别新的测试文件位置
3. **CI/CD**：更新持续集成配置中的测试路径
4. **文档更新**：更新项目文档中的测试相关说明