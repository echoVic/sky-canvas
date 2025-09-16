# CLAUDE.md

always respond in Chinese

1. 以暗猜接口为耻，以认真查阅为荣
   - Shame on guessing interfaces secretly; take pride in careful research.
2. 以模糊执行为耻，以寻求确认为荣
   - Shame on vague implementation; take pride in seeking confirmation.
3. 以盲想业务为耻，以人类确认为荣
   - Shame on blindly imagining business; take pride in human confirmation.
4. 以创造接口为耻，以复用现有为荣
   - Shame on creating new interfaces; take pride in reusing existing ones.
5. 以跳过验证为耻，以主动测试为荣
   - Shame on skipping verification; take pride in proactive testing.
6. 以破坏架构为耻，以遵循规范为荣
   - Shame on breaking the architecture; take pride in following the standards.
7. 以假装理解为耻，以诚实无知为荣
   - Shame on pretending to understand; take pride in honest admission of ignorance.
8. 以盲目修改为耻，以谨慎重构为荣
   - Shame on blind modification; take pride in careful refactoring.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sky Canvas is a high-performance graphics rendering engine and infinite canvas drawing application built with a modern three-layer architecture:

1. **Render Engine** (`packages/render-engine/`) - Framework-agnostic WebGL-focused rendering engine
2. **Canvas SDK** (`packages/canvas-sdk/`) - Reusable canvas functionality with interaction systems
3. **Frontend UI** (`src/`) - React-based pure UI layer using the SDK

## Development Commands

### Essential Commands
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build the project
pnpm build

# Run all tests
pnpm test

# Run specific test suites
pnpm test:packages        # Test all packages
pnpm test:frontend        # Test frontend components
pnpm test:integration     # Integration tests
pnpm test:e2e            # End-to-end tests

# Test with coverage
pnpm test:coverage

# Math library specific tests
pnpm test:math
pnpm test:math:ts
```

### Package-Specific Commands
```bash
# Test individual packages
pnpm --filter @sky-canvas/render-engine test
pnpm --filter @sky-canvas/canvas-sdk test

# Build individual packages  
pnpm --filter @sky-canvas/render-engine build
pnpm --filter @sky-canvas/canvas-sdk build
```

## Architecture Principles

### Monorepo Structure
- Uses pnpm workspaces with workspace dependencies
- Three-layer architecture with clear separation of concerns
- All packages must maintain zero circular dependencies

### Code Quality Standards
- Each file should not exceed 200 lines
- Each folder should not exceed 8 files
- TypeScript strict mode enabled with path aliases (@/* maps to src/*)
- Test coverage threshold: 85% for branches, functions, lines, and statements

### Render Engine (`packages/render-engine/`)
- Framework-agnostic graphics rendering
- Supports Canvas2D, WebGL, and WebGPU (in development)
- Modern rendering pipeline with batch processing
- Spatial partitioning for performance optimization
- Command-based rendering architecture

### Canvas SDK (`packages/canvas-sdk/`)
- Complete canvas functionality API
- Shape management (Rectangle, Circle, Path, Text, Diamond)
- Interaction system with collision detection
- History management with undo/redo
- Plugin architecture and AI extension interfaces
- Event-driven architecture

### Frontend UI (`src/`)
- Pure UI layer - no direct canvas manipulation
- All canvas operations go through Canvas SDK
- React 18 with TypeScript and Zustand for UI state
- Custom hooks for SDK integration (`useCanvasSDK`, `useDrawingTools`, `useCanvasInteraction`)

## Key Integration Points

### Using Canvas SDK in Frontend
```typescript
// Always use through Context Provider
import { useCanvas } from '../contexts';

function Component() {
  const [sdkState, sdkActions] = useCanvas();
  // Access shapes: sdkState.shapes
  // Perform actions: sdkActions.addShape(shape)
}
```

### Graphics Context Adapters
- Canvas2D: `src/adapters/Canvas2DAdapter.ts`
- WebGL: `packages/render-engine/src/adapters/WebGLContext.ts`
- All implement `IGraphicsContext` interface

### Shape Creation Pattern
```typescript
// Use factory pattern from SDK
import { createShape } from '../hooks';
const shape = createShape('rectangle', startPoint, endPoint);
```

## Testing Strategy

### Test Configuration
- Main tests: `vitest.config.ts` (jsdom environment)
- Frontend tests: `vitest.frontend.config.ts`
- Integration tests: `vitest.integration.config.ts`
- E2E tests: `vitest.e2e.config.ts`

### Test Structure
- Unit tests alongside source files in `__tests__/` folders
- Integration tests in `src/tests/`
- Each package has its own test configuration

## Performance Considerations

### Render Engine Optimization
- Batch rendering for multiple shapes
- Spatial partitioning for viewport culling
- WebGL buffer management and resource pooling
- Multi-threaded rendering support

### SDK Performance
- Event-driven updates to minimize re-renders
- Collision detection optimization
- Memory management for large scenes

### Frontend Performance
- React.memo and useCallback for component optimization
- Canvas size auto-adaptation
- Only render visible shapes

## Development Workflow

### Adding New Features
1. Determine which layer the feature belongs to
2. For shapes: Implement in Canvas SDK first, then UI integration
3. For rendering: Implement in Render Engine, expose through SDK
4. Always write tests with 85%+ coverage
5. Update TypeScript interfaces as needed

### Working with Packages
- Each package has independent `package.json`, `tsconfig.json`, and `vitest.config.ts`
- Use workspace dependencies (`workspace:^1.0.0`) between packages
- Test packages independently before integration

### Common Patterns
- Use factory patterns for shape creation
- Implement interfaces rather than concrete classes where possible
- Follow event-driven architecture for state updates
- Maintain separation between UI state (Zustand) and business state (SDK)

## Debugging

### Development Mode
- Canvas shows debug info (shape count, selected count, current tool, SDK status)
- Enable via environment or development build

### Common Issues
- SDK initialization failures: Check canvas element and adapter support
- Shape rendering issues: Verify `visible` property and render method implementation
- Interaction problems: Check event listener binding and tool type matching

## Dependencies Note

This project uses specific, well-established libraries:
- React 18 with TypeScript
- Vite for build system
- Vitest for testing
- Zustand for UI state management  
- Tailwind CSS for styling
- ahooks for React utilities

When adding new features, first check if the required functionality already exists in the current dependency set before suggesting new libraries.

Don’t use any for typescript type. Find the most suitable type first. If you really can’t find it, use unknown.