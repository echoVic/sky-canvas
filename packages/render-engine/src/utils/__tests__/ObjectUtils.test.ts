/**
 * ObjectUtils 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  compareNestedProperty,
  deepClone,
  deepMerge,
  deleteNestedProperty,
  getNestedProperty,
  getNestedPropertySafe,
  getObjectPaths,
  hasNestedProperty,
  setNestedProperty
} from '../ObjectUtils';

describe('ObjectUtils', () => {
  describe('getNestedProperty', () => {
    let testObject: any;

    beforeEach(() => {
      // Arrange: 准备测试对象
      testObject = {
        name: 'test',
        transform: {
          position: {
            x: 10,
            y: 20,
            z: 30
          },
          rotation: {
            angle: 45
          }
        },
        array: [1, 2, { nested: 'value' }],
        nullValue: null,
        undefinedValue: undefined,
        zeroValue: 0,
        emptyString: '',
        falseValue: false
      };
    });

    describe('Given a nested object', () => {
      describe('When accessing existing properties', () => {
        it('Then should return top-level property', () => {
          // Act: 获取顶级属性
          const result = getNestedProperty(testObject, 'name');

          // Assert: 验证返回值
          expect(result).toBe('test');
        });

        it('Then should return nested property', () => {
          // Act: 获取嵌套属性
          const result = getNestedProperty(testObject, 'transform.position.x');

          // Assert: 验证返回值
          expect(result).toBe(10);
        });

        it('Then should return deeply nested property', () => {
          // Act: 获取深层嵌套属性
          const result = getNestedProperty(testObject, 'transform.rotation.angle');

          // Assert: 验证返回值
          expect(result).toBe(45);
        });

        it('Then should return falsy values correctly', () => {
          // Act & Assert: 测试各种假值
          expect(getNestedProperty(testObject, 'nullValue')).toBeNull();
          expect(getNestedProperty(testObject, 'undefinedValue')).toBeUndefined();
          expect(getNestedProperty(testObject, 'zeroValue')).toBe(0);
          expect(getNestedProperty(testObject, 'emptyString')).toBe('');
          expect(getNestedProperty(testObject, 'falseValue')).toBe(false);
        });
      });

      describe('When accessing non-existent properties', () => {
        it('Then should return undefined for non-existent top-level property', () => {
          // Act: 获取不存在的顶级属性
          const result = getNestedProperty(testObject, 'nonExistent');

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });

        it('Then should return undefined for non-existent nested property', () => {
          // Act: 获取不存在的嵌套属性
          const result = getNestedProperty(testObject, 'transform.nonExistent.property');

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });

        it('Then should return undefined for property on null value', () => {
          // Act: 在null值上获取属性
          const result = getNestedProperty(testObject, 'nullValue.property');

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });
      });

      describe('When providing invalid inputs', () => {
        it('Then should return undefined for null object', () => {
          // Act: 在null对象上获取属性
          const result = getNestedProperty(null, 'property');

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });

        it('Then should return undefined for undefined object', () => {
          // Act: 在undefined对象上获取属性
          const result = getNestedProperty(undefined, 'property');

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });

        it('Then should return undefined for empty path', () => {
          // Act: 使用空路径
          const result = getNestedProperty(testObject, '');

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });

        it('Then should return undefined for non-object input', () => {
          // Act: 在非对象上获取属性
          const result = getNestedProperty('string', 'property');

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });
      });
    });
  });

  describe('setNestedProperty', () => {
    let testObject: any;

    beforeEach(() => {
      // Arrange: 准备测试对象
      testObject = {
        existing: {
          nested: {
            value: 'old'
          }
        }
      };
    });

    describe('Given a nested object', () => {
      describe('When setting existing properties', () => {
        it('Then should update top-level property', () => {
          // Act: 设置顶级属性
          setNestedProperty(testObject, 'newProperty', 'newValue');

          // Assert: 验证属性被设置
          expect(testObject.newProperty).toBe('newValue');
        });

        it('Then should update nested property', () => {
          // Act: 设置嵌套属性
          setNestedProperty(testObject, 'existing.nested.value', 'updated');

          // Assert: 验证嵌套属性被更新
          expect(testObject.existing.nested.value).toBe('updated');
        });

        it('Then should update deeply nested property', () => {
          // Act: 设置深层嵌套属性
          setNestedProperty(testObject, 'existing.nested.deep.property', 'deepValue');

          // Assert: 验证深层属性被设置
          expect(testObject.existing.nested.deep.property).toBe('deepValue');
        });
      });

      describe('When creating new nested structures', () => {
        it('Then should create new nested object structure', () => {
          // Act: 创建新的嵌套结构
          setNestedProperty(testObject, 'new.nested.structure', 'value');

          // Assert: 验证新结构被创建
          expect(testObject.new.nested.structure).toBe('value');
          expect(typeof testObject.new).toBe('object');
          expect(typeof testObject.new.nested).toBe('object');
        });

        it('Then should create deeply nested structure', () => {
          // Act: 创建深层嵌套结构
          setNestedProperty(testObject, 'a.b.c.d.e.f', 'deepValue');

          // Assert: 验证深层结构被创建
          expect(testObject.a.b.c.d.e.f).toBe('deepValue');
        });

        it('Then should overwrite non-object intermediate values', () => {
          // Arrange: 设置中间路径为非对象值
          testObject.path = 'string';

          // Act: 在非对象路径上设置嵌套属性
          setNestedProperty(testObject, 'path.nested.property', 'value');

          // Assert: 验证中间值被覆盖为对象
          expect(testObject.path.nested.property).toBe('value');
          expect(typeof testObject.path).toBe('object');
        });
      });

      describe('When providing invalid inputs', () => {
        it('Then should handle null object gracefully', () => {
          // Act & Assert: 在null对象上设置属性不应抛出错误
          expect(() => setNestedProperty(null, 'property', 'value')).not.toThrow();
        });

        it('Then should handle undefined object gracefully', () => {
          // Act & Assert: 在undefined对象上设置属性不应抛出错误
          expect(() => setNestedProperty(undefined, 'property', 'value')).not.toThrow();
        });

        it('Then should handle empty path gracefully', () => {
          // Act & Assert: 使用空路径不应抛出错误
          expect(() => setNestedProperty(testObject, '', 'value')).not.toThrow();
        });

        it('Then should handle non-object input gracefully', () => {
          // Act & Assert: 在非对象上设置属性不应抛出错误
          expect(() => setNestedProperty('string', 'property', 'value')).not.toThrow();
        });
      });
    });
  });

  describe('getNestedPropertySafe', () => {
    let testObject: Record<string, any>;

    beforeEach(() => {
      // Arrange: 准备测试对象
      testObject = {
        stringValue: 'test',
        numberValue: 42,
        booleanValue: true,
        nested: {
          value: 'nestedString'
        }
      };
    });

    describe('Given a typed object', () => {
      describe('When accessing properties with type safety', () => {
        it('Then should return typed value for existing property', () => {
          // Act: 获取类型安全的属性值
          const result = getNestedPropertySafe<string>(testObject, 'stringValue');

          // Assert: 验证返回正确类型的值
          expect(result).toBe('test');
          expect(typeof result).toBe('string');
        });

        it('Then should return typed value for nested property', () => {
          // Act: 获取类型安全的嵌套属性值
          const result = getNestedPropertySafe<string>(testObject, 'nested.value');

          // Assert: 验证返回正确类型的值
          expect(result).toBe('nestedString');
          expect(typeof result).toBe('string');
        });

        it('Then should return undefined for non-existent property', () => {
          // Act: 获取不存在的属性
          const result = getNestedPropertySafe<string>(testObject, 'nonExistent');

          // Assert: 验证返回undefined
          expect(result).toBeUndefined();
        });
      });
    });
  });

  describe('hasNestedProperty', () => {
    let testObject: any;

    beforeEach(() => {
      // Arrange: 准备测试对象
      testObject = {
        existing: {
          nested: {
            value: 'test',
            nullValue: null,
            undefinedValue: undefined,
            zeroValue: 0,
            emptyString: '',
            falseValue: false
          }
        }
      };
    });

    describe('Given a nested object', () => {
      describe('When checking property existence', () => {
        it('Then should return true for existing top-level property', () => {
          // Act: 检查顶级属性存在性
          const result = hasNestedProperty(testObject, 'existing');

          // Assert: 验证属性存在
          expect(result).toBe(true);
        });

        it('Then should return true for existing nested property', () => {
          // Act: 检查嵌套属性存在性
          const result = hasNestedProperty(testObject, 'existing.nested.value');

          // Assert: 验证嵌套属性存在
          expect(result).toBe(true);
        });

        it('Then should return true for falsy but existing properties', () => {
          // Act & Assert: 检查各种假值属性的存在性
          expect(hasNestedProperty(testObject, 'existing.nested.nullValue')).toBe(true);
          expect(hasNestedProperty(testObject, 'existing.nested.undefinedValue')).toBe(true);
          expect(hasNestedProperty(testObject, 'existing.nested.zeroValue')).toBe(true);
          expect(hasNestedProperty(testObject, 'existing.nested.emptyString')).toBe(true);
          expect(hasNestedProperty(testObject, 'existing.nested.falseValue')).toBe(true);
        });

        it('Then should return false for non-existent property', () => {
          // Act: 检查不存在属性
          const result = hasNestedProperty(testObject, 'nonExistent');

          // Assert: 验证属性不存在
          expect(result).toBe(false);
        });

        it('Then should return false for non-existent nested property', () => {
          // Act: 检查不存在的嵌套属性
          const result = hasNestedProperty(testObject, 'existing.nonExistent.property');

          // Assert: 验证嵌套属性不存在
          expect(result).toBe(false);
        });
      });

      describe('When providing invalid inputs', () => {
        it('Then should return false for null object', () => {
          // Act: 在null对象上检查属性
          const result = hasNestedProperty(null, 'property');

          // Assert: 验证返回false
          expect(result).toBe(false);
        });

        it('Then should return false for empty path', () => {
          // Act: 使用空路径检查
          const result = hasNestedProperty(testObject, '');

          // Assert: 验证返回false
          expect(result).toBe(false);
        });
      });
    });
  });

  describe('deleteNestedProperty', () => {
    let testObject: any;

    beforeEach(() => {
      // Arrange: 准备测试对象
      testObject = {
        topLevel: 'value',
        nested: {
          property: 'nestedValue',
          deep: {
            property: 'deepValue'
          }
        }
      };
    });

    describe('Given a nested object', () => {
      describe('When deleting existing properties', () => {
        it('Then should delete top-level property', () => {
          // Act: 删除顶级属性
          const result = deleteNestedProperty(testObject, 'topLevel');

          // Assert: 验证属性被删除
          expect(result).toBe(true);
          expect('topLevel' in testObject).toBe(false);
        });

        it('Then should delete nested property', () => {
          // Act: 删除嵌套属性
          const result = deleteNestedProperty(testObject, 'nested.property');

          // Assert: 验证嵌套属性被删除
          expect(result).toBe(true);
          expect('property' in testObject.nested).toBe(false);
          expect(testObject.nested.deep).toBeDefined(); // 其他属性应保持不变
        });

        it('Then should delete deeply nested property', () => {
          // Act: 删除深层嵌套属性
          const result = deleteNestedProperty(testObject, 'nested.deep.property');

          // Assert: 验证深层属性被删除
          expect(result).toBe(true);
          expect('property' in testObject.nested.deep).toBe(false);
          expect(testObject.nested.property).toBeDefined(); // 其他属性应保持不变
        });
      });

      describe('When deleting non-existent properties', () => {
        it('Then should return false for non-existent top-level property', () => {
          // Act: 删除不存在的顶级属性
          const result = deleteNestedProperty(testObject, 'nonExistent');

          // Assert: 验证删除失败
          expect(result).toBe(false);
        });

        it('Then should return false for non-existent nested property', () => {
          // Act: 删除不存在的嵌套属性
          const result = deleteNestedProperty(testObject, 'nested.nonExistent');

          // Assert: 验证删除失败
          expect(result).toBe(false);
        });

        it('Then should return false for property on non-existent path', () => {
          // Act: 在不存在的路径上删除属性
          const result = deleteNestedProperty(testObject, 'nonExistent.property');

          // Assert: 验证删除失败
          expect(result).toBe(false);
        });
      });

      describe('When providing invalid inputs', () => {
        it('Then should return false for null object', () => {
          // Act: 在null对象上删除属性
          const result = deleteNestedProperty(null, 'property');

          // Assert: 验证返回false
          expect(result).toBe(false);
        });

        it('Then should return false for empty path', () => {
          // Act: 使用空路径删除
          const result = deleteNestedProperty(testObject, '');

          // Assert: 验证返回false
          expect(result).toBe(false);
        });
      });
    });
  });

  describe('deepClone', () => {
    describe('Given various data types', () => {
      describe('When cloning primitive values', () => {
        it('Then should clone string correctly', () => {
          // Arrange: 准备字符串
          const original = 'test string';

          // Act: 深拷贝字符串
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toBe(original);
          expect(typeof cloned).toBe('string');
        });

        it('Then should clone number correctly', () => {
          // Arrange: 准备数字
          const original = 42;

          // Act: 深拷贝数字
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toBe(original);
          expect(typeof cloned).toBe('number');
        });

        it('Then should clone boolean correctly', () => {
          // Arrange: 准备布尔值
          const original = true;

          // Act: 深拷贝布尔值
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toBe(original);
          expect(typeof cloned).toBe('boolean');
        });

        it('Then should clone null correctly', () => {
          // Arrange: 准备null值
          const original = null;

          // Act: 深拷贝null
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toBeNull();
        });

        it('Then should clone undefined correctly', () => {
          // Arrange: 准备undefined值
          const original = undefined;

          // Act: 深拷贝undefined
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toBeUndefined();
        });
      });

      describe('When cloning arrays', () => {
        it('Then should clone simple array correctly', () => {
          // Arrange: 准备简单数组
          const original = [1, 2, 3, 'test', true];

          // Act: 深拷贝数组
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toEqual(original);
          expect(cloned).not.toBe(original); // 不是同一个引用
          expect(Array.isArray(cloned)).toBe(true);
        });

        it('Then should clone nested array correctly', () => {
          // Arrange: 准备嵌套数组
          const original = [1, [2, 3], [4, [5, 6]]] as any;

          // Act: 深拷贝嵌套数组
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toEqual(original);
          expect(cloned).not.toBe(original);
          expect((cloned as any)[1]).not.toBe((original as any)[1]);
          expect((cloned as any)[2][1]).not.toBe((original as any)[2][1]);
        });

        it('Then should clone array with objects correctly', () => {
          // Arrange: 准备包含对象的数组
          const original = [{ a: 1 }, { b: { c: 2 } }];

          // Act: 深拷贝包含对象的数组
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toEqual(original);
          expect(cloned[0]).not.toBe(original[0]);
          expect(cloned[1].b).not.toBe(original[1].b);
        });
      });

      describe('When cloning objects', () => {
        it('Then should clone simple object correctly', () => {
          // Arrange: 准备简单对象
          const original = {
            name: 'test',
            age: 25,
            active: true
          };

          // Act: 深拷贝对象
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toEqual(original);
          expect(cloned).not.toBe(original);
        });

        it('Then should clone nested object correctly', () => {
          // Arrange: 准备嵌套对象
          const original = {
            user: {
              profile: {
                name: 'John',
                settings: {
                  theme: 'dark'
                }
              }
            }
          };

          // Act: 深拷贝嵌套对象
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toEqual(original);
          expect(cloned.user).not.toBe(original.user);
          expect(cloned.user.profile).not.toBe(original.user.profile);
          expect(cloned.user.profile.settings).not.toBe(original.user.profile.settings);
        });

        it('Then should clone object with arrays correctly', () => {
          // Arrange: 准备包含数组的对象
          const original = {
            items: [1, 2, 3],
            nested: {
              list: ['a', 'b', 'c']
            }
          };

          // Act: 深拷贝包含数组的对象
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toEqual(original);
          expect(cloned.items).not.toBe(original.items);
          expect(cloned.nested.list).not.toBe(original.nested.list);
        });
      });

      describe('When cloning complex structures', () => {
        it('Then should handle circular references gracefully', () => {
          // Arrange: 准备循环引用对象
          const original: any = { name: 'test' };
          original.self = original;

          // Act & Assert: 深拷贝循环引用应该抛出错误
          expect(() => deepClone(original)).toThrow('Circular reference detected');
        });

        it('Then should clone Date objects correctly', () => {
          // Arrange: 准备Date对象
          const original = new Date('2023-01-01');

          // Act: 深拷贝Date对象
          const cloned = deepClone(original);

          // Assert: 验证拷贝结果
          expect(cloned).toEqual(original);
          expect(cloned).not.toBe(original);
          expect(cloned instanceof Date).toBe(true);
        });
      });
    });
  });

  describe('deepMerge', () => {
    describe('Given target and source objects', () => {
      describe('When merging simple objects', () => {
        it('Then should merge properties correctly', () => {
          // Arrange: 准备目标和源对象
          const target = { a: 1, b: 2 };
          const source = { b: 3, c: 4 };

          // Act: 深度合并对象
          const result = deepMerge(target, source as Partial<typeof target>);

          // Assert: 验证合并结果
          expect(result).toEqual({ a: 1, b: 3, c: 4 });
          expect(result).toBe(target); // 应该修改目标对象
        });

        it('Then should handle multiple sources', () => {
          // Arrange: 准备目标和多个源对象
          const target = { a: 1 };
          const source1 = { b: 2 };
          const source2 = { c: 3 };
          const source3 = { d: 4 };

          // Act: 合并多个源对象
          const result = deepMerge(target as any, source1, source2, source3);

          // Assert: 验证合并结果
          expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
        });
      });

      describe('When merging nested objects', () => {
        it('Then should merge nested properties correctly', () => {
          // Arrange: 准备嵌套对象
          const target = {
            user: {
              name: 'John',
              age: 25
            },
            settings: {
              theme: 'light'
            }
          };
          const source = {
            user: {
              age: 26,
              email: 'john@example.com'
            },
            settings: {
              language: 'en'
            }
          };

          // Act: 深度合并嵌套对象
          const result = deepMerge(target as any, source);

          // Assert: 验证合并结果
          expect(result.user).toEqual({
            name: 'John',
            age: 26,
            email: 'john@example.com'
          });
          expect(result.settings).toEqual({
            theme: 'light',
            language: 'en'
          });
        });

        it('Then should handle deeply nested objects', () => {
          // Arrange: 准备深层嵌套对象
          const target = {
            level1: {
              level2: {
                level3: {
                  value: 'original'
                }
              }
            }
          };
          const source = {
            level1: {
              level2: {
                level3: {
                  newValue: 'added'
                },
                newLevel3: 'new'
              }
            }
          };

          // Act: 深度合并深层嵌套对象
          const result = deepMerge(target as any, source);

          // Assert: 验证合并结果
          expect((result as any).level1.level2.level3).toEqual({
            value: 'original',
            newValue: 'added'
          });
          expect((result as any).level1.level2.newLevel3).toBe('new');
        });
      });

      describe('When merging arrays', () => {
        it('Then should replace arrays instead of merging', () => {
          // Arrange: 准备包含数组的对象
          const target = { items: [1, 2, 3] };
          const source = { items: [4, 5] };

          // Act: 合并包含数组的对象
          const result = deepMerge(target, source as Partial<typeof target>);

          // Assert: 验证数组被替换而不是合并
          expect(result.items).toEqual([4, 5]);
        });
      });

      describe('When handling edge cases', () => {
        it('Then should handle null and undefined values', () => {
          // Arrange: 准备包含null和undefined的对象
          const target = { a: 1, b: null, c: undefined };
          const source = { a: null, b: 2, d: undefined };

          // Act: 合并包含特殊值的对象
          const result = deepMerge(target as any, source);

          // Assert: 验证特殊值处理
          expect((result as any).a).toBeNull();
          expect((result as any).b).toBe(2);
          expect((result as any).c).toBeUndefined();
          expect((result as any).d).toBeUndefined();
        });

        it('Then should handle empty objects', () => {
          // Arrange: 准备空对象
          const target = { a: 1 };
          const source = {};

          // Act: 合并空对象
          const result = deepMerge(target, source as Partial<typeof target>);

          // Assert: 验证空对象合并
          expect(result).toEqual({ a: 1 });
        });
      });
    });
  });

  describe('getObjectPaths', () => {
    describe('Given a nested object', () => {
      describe('When extracting all property paths', () => {
        it('Then should return all paths for simple object', () => {
          // Arrange: 准备简单对象
          const obj = {
            name: 'test',
            age: 25,
            active: true
          };

          // Act: 获取所有路径
          const paths = getObjectPaths(obj);

          // Assert: 验证路径列表
          expect(paths).toEqual(['name', 'age', 'active']);
        });

        it('Then should return nested paths for complex object', () => {
          // Arrange: 准备复杂嵌套对象
          const obj = {
            user: {
              profile: {
                name: 'John',
                age: 25
              },
              settings: {
                theme: 'dark'
              }
            },
            config: {
              debug: true
            }
          };

          // Act: 获取所有路径
          const paths = getObjectPaths(obj);

          // Assert: 验证嵌套路径
          expect(paths).toContain('user.profile.name');
          expect(paths).toContain('user.profile.age');
          expect(paths).toContain('user.settings.theme');
          expect(paths).toContain('config.debug');
          expect(paths.length).toBe(4);
        });

        it('Then should handle arrays correctly', () => {
          // Arrange: 准备包含数组的对象
          const obj = {
            items: [1, 2, 3],
            nested: {
              list: ['a', 'b']
            }
          };

          // Act: 获取所有路径
          const paths = getObjectPaths(obj);

          // Assert: 验证数组路径处理
          expect(paths).toContain('items');
          expect(paths).toContain('nested.list');
        });

        it('Then should use custom prefix', () => {
          // Arrange: 准备对象和自定义前缀
          const obj = { name: 'test', nested: { value: 1 } };
          const prefix = 'root';

          // Act: 使用自定义前缀获取路径
          const paths = getObjectPaths(obj, prefix);

          // Assert: 验证自定义前缀
          expect(paths).toContain('root.name');
          expect(paths).toContain('root.nested.value');
        });
      });
    });
  });

  describe('compareNestedProperty', () => {
    describe('Given two objects and a property path', () => {
      describe('When comparing property values', () => {
        it('Then should return true for equal values', () => {
          // Arrange: 准备两个对象
          const obj1 = { user: { name: 'John', age: 25 } };
          const obj2 = { user: { name: 'John', age: 25 } };

          // Act: 比较嵌套属性
          const result = compareNestedProperty(obj1, obj2, 'user.name');

          // Assert: 验证比较结果
          expect(result).toBe(true);
        });

        it('Then should return false for different values', () => {
          // Arrange: 准备两个不同的对象
          const obj1 = { user: { name: 'John' } };
          const obj2 = { user: { name: 'Jane' } };

          // Act: 比较嵌套属性
          const result = compareNestedProperty(obj1, obj2, 'user.name');

          // Assert: 验证比较结果
          expect(result).toBe(false);
        });

        it('Then should return false when property exists in one object only', () => {
          // Arrange: 准备一个有属性一个没有的对象
          const obj1 = { user: { name: 'John' } };
          const obj2 = { user: {} };

          // Act: 比较嵌套属性
          const result = compareNestedProperty(obj1, obj2, 'user.name');

          // Assert: 验证比较结果
          expect(result).toBe(false);
        });

        it('Then should return true when property is missing in both objects', () => {
          // Arrange: 准备两个都没有该属性的对象
          const obj1 = { user: {} };
          const obj2 = { user: {} };

          // Act: 比较不存在的嵌套属性
          const result = compareNestedProperty(obj1, obj2, 'user.nonExistent');

          // Assert: 验证比较结果
          expect(result).toBe(true);
        });

        it('Then should handle complex nested paths', () => {
          // Arrange: 准备复杂嵌套对象
          const obj1 = {
            config: {
              database: {
                connection: {
                  host: 'localhost'
                }
              }
            }
          };
          const obj2 = {
            config: {
              database: {
                connection: {
                  host: 'localhost'
                }
              }
            }
          };

          // Act: 比较深层嵌套属性
          const result = compareNestedProperty(obj1, obj2, 'config.database.connection.host');

          // Assert: 验证比较结果
          expect(result).toBe(true);
        });
      });
    });
  });
});