# Sky Canvas 指令系统架构图 (Mermaid)

## 1. 整体架构图

```mermaid
graph TB
    subgraph "前端 UI 层"
        A[React 组件]
        B[useCanvasSDK Hook]
        C[用户交互事件]
    end
    
    subgraph "Canvas SDK 层"
        D[CanvasSDK]
        E[CommandExecutor]
        F[CommandHandler]
        G[HistoryService]
        H[CanvasManager]
        I[EventBus]
    end
    
    subgraph "Render Engine 层"
        J[Shape 实例]
        K[Rectangle]
        L[Circle]
        M[Text]
        N[Canvas 渲染]
    end
    
    C --> A
    A --> B
    B --> D
    D --> E
    E --> F
    F --> H
    H --> J
    J --> K
    J --> L
    J --> M
    K --> N
    L --> N
    M --> N
    
    E --> G
    E --> I
    I --> B
    
    style A fill:#e1f5fe
    style D fill:#f3e5f5
    style J fill:#fff3e0
```

## 2. 指令执行流程图

```mermaid
sequenceDiagram
    participant UI as 前端组件
    participant Hook as useCanvasSDK
    participant SDK as CanvasSDK
    participant Executor as CommandExecutor
    participant Handler as CommandHandler
    participant Manager as CanvasManager
    participant Engine as Render Engine
    participant History as HistoryService
    
    UI->>Hook: 用户操作 (添加矩形)
    Hook->>SDK: executeCommand(command)
    SDK->>Executor: execute(command)
    
    Executor->>Executor: 1. validateCommand()
    Executor->>Handler: 2. getHandler(command.type)
    Handler->>Handler: 3. validate(payload)
    Handler->>Manager: 4. execute(payload, manager)
    Manager->>Engine: 5. 创建 Shape 实例
    Engine->>Engine: 6. 渲染更新
    
    Executor->>History: 7. 记录历史
    Executor->>Hook: 8. 发布事件
    Hook->>UI: 9. 状态更新
```

## 3. 指令类型结构图

```mermaid
classDiagram
    class CanvasCommand {
        +CommandType type
        +any payload
        +CommandMetadata metadata
    }
    
    class CommandMetadata {
        +number timestamp
        +string source
        +string transactionId
        +string userId
    }
    
    class CommandType {
        <<enumeration>>
        ADD_SHAPE
        UPDATE_SHAPE
        DELETE_SHAPE
        SELECT_SHAPE
        MOVE_SHAPE
        RESIZE_SHAPE
        ROTATE_SHAPE
        BATCH_COMMAND
        CLEAR_CANVAS
    }
    
    class AddShapeCommand {
        +string shapeType
        +object properties
        +string id
    }
    
    class UpdateShapeCommand {
        +string id
        +object updates
    }
    
    class BatchCommand {
        +CanvasCommand[] commands
        +boolean atomic
    }
    
    CanvasCommand --> CommandType
    CanvasCommand --> CommandMetadata
    CanvasCommand <|-- AddShapeCommand
    CanvasCommand <|-- UpdateShapeCommand
    CanvasCommand <|-- BatchCommand
```

## 4. 指令处理器架构图

```mermaid
graph TB
    subgraph "CommandExecutor"
        A[execute方法]
        B[validateCommand]
        C[getHandler]
        D[createHistoryCommand]
        E[发布事件]
    end
    
    subgraph "CommandHandlers"
        F[AddShapeHandler]
        G[UpdateShapeHandler]
        H[DeleteShapeHandler]
        I[MoveShapeHandler]
        J[BatchCommandHandler]
    end
    
    subgraph "核心服务"
        K[CanvasManager]
        L[HistoryService]
        M[EventBus]
    end
    
    A --> B
    B --> C
    C --> F
    C --> G
    C --> H
    C --> I
    C --> J
    
    F --> K
    G --> K
    H --> K
    I --> K
    J --> A
    
    A --> D
    D --> L
    A --> E
    E --> M
    
    style A fill:#ffeb3b
    style K fill:#4caf50
    style L fill:#2196f3
    style M fill:#ff9800
```

## 5. 数据流向图

```mermaid
flowchart LR
    A[用户操作] --> B[创建指令]
    B --> C[指令验证]
    C --> D[获取处理器]
    D --> E[执行指令]
    E --> F[更新画布]
    F --> G[记录历史]
    G --> H[发布事件]
    H --> I[UI 更新]
    
    subgraph "错误处理"
        J[验证失败]
        K[执行失败]
        L[回滚操作]
    end
    
    C -.-> J
    E -.-> K
    K -.-> L
    
    style A fill:#e8f5e8
    style I fill:#e8f5e8
    style J fill:#ffebee
    style K fill:#ffebee
    style L fill:#ffebee
```

## 6. 组件依赖关系图

```mermaid
graph TD
    A[前端组件] --> B[useCanvasSDK]
    B --> C[CanvasSDK]
    C --> D[CommandExecutor]
    D --> E[CommandHandler接口]
    
    E --> F[AddShapeHandler]
    E --> G[UpdateShapeHandler]
    E --> H[DeleteShapeHandler]
    E --> I[其他Handler]
    
    F --> J[CanvasManager]
    G --> J
    H --> J
    I --> J
    
    J --> K[Shape实例]
    K --> L[Rectangle]
    K --> M[Circle]
    K --> N[Text]
    
    D --> O[HistoryService]
    D --> P[EventBus]
    
    P --> B
    
    style A fill:#e3f2fd
    style C fill:#f3e5f5
    style J fill:#fff3e0
    style O fill:#e8f5e8
    style P fill:#fce4ec
```

## 7. 指令生命周期图

```mermaid
stateDiagram-v2
    [*] --> Created: 创建指令
    Created --> Validating: 开始验证
    Validating --> Valid: 验证通过
    Validating --> Invalid: 验证失败
    Invalid --> [*]: 抛出错误
    
    Valid --> Executing: 开始执行
    Executing --> Executed: 执行成功
    Executing --> Failed: 执行失败
    
    Executed --> Recording: 记录历史
    Recording --> Recorded: 记录完成
    Recorded --> Publishing: 发布事件
    Publishing --> Published: 事件发布
    Published --> [*]: 完成
    
    Failed --> Rollback: 回滚操作
    Rollback --> [*]: 回滚完成
```

## 使用说明

这些 Mermaid 图表可以直接在支持 Mermaid 的 Markdown 编辑器中渲染，如：
- GitHub
- GitLab
- Notion
- Typora
- VS Code (with Mermaid extension)

或者可以使用在线工具：
- [Mermaid Live Editor](https://mermaid.live/)
- [Mermaid Chart](https://www.mermaidchart.com/)