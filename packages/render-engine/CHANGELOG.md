# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open source preparation
- Complete project documentation
- Contributing guidelines
- Code of conduct

## [1.0.0] - 2026-01-03

### Added
- 🚀 Framework-agnostic rendering engine
- 🎨 Multi-adapter support (Canvas2D, WebGL, WebGPU)
- ⚡ High-performance batch rendering system
- 🔧 Complete TypeScript support
- 🧪 Comprehensive test coverage with Vitest
- 🎭 Rich visual effects (filters, blending, lighting, masks)
- ⚙️ Modular architecture

#### Core Features
- **Rendering Engine**: Main rendering loop with FPS control and VSync
- **Graphics Context**: Unified interface for different rendering backends
- **Batch System**: Optimized batch rendering with multiple strategies
- **Culling System**: Frustum culling and spatial partitioning
- **Command System**: Command pattern for render operations

#### Adapters
- **Canvas2D Adapter**: Full Canvas 2D API implementation
- **WebGL Adapter**: Hardware-accelerated WebGL rendering
- **WebGPU Adapter**: Next-generation WebGPU support (partial)

#### Features
- **Animation System**: Property animations, path animations, easing functions
- **Particle System**: GPU-accelerated particle effects
- **Text Rendering**: Advanced text layout with font management and i18n support
- **Effects System**: 
  - Filters (blur, brightness, contrast, etc.)
  - Blend modes
  - Lighting (point light, directional light)
  - Masks (rectangle, circle, polygon, custom)
  - Post-processing effects
- **Physics Integration**: Basic physics world integration
- **Plugin System**: Extensible plugin architecture
- **Scene Editor**: Interactive scene editing tools
- **Performance Monitoring**: Unified performance tracking and analysis

#### Math Library
- Vector2 operations
- Matrix transformations
- Geometry utilities
- Collision detection
- Coordinate system conversions

#### Resource Management
- Texture loading and management
- Texture atlas support
- Resource pooling
- Async resource loading
- LRU cache implementation

#### Performance Optimizations
- Batch rendering
- Frustum culling
- Object pooling
- Dirty region tracking
- Layer caching
- GPU memory optimization

### Documentation
- Comprehensive README with examples
- API documentation
- Architecture overview
- Performance testing guide
- Rich text rendering guide
- Font loading guide

### Development
- TypeScript 5.8+ support
- Vitest testing framework
- Source maps for debugging
- Development mode with watch
- Example projects

[Unreleased]: https://github.com/sky-canvas/sky-canvas/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/sky-canvas/sky-canvas/releases/tag/v0.0.1
