/**
 * 对象工具函数
 * 提供对象属性访问和操作的通用方法
 */

/**
 * 获取嵌套属性值
 * @param obj 目标对象
 * @param path 属性路径，支持点分隔的嵌套路径 (如 "transform.position.x")
 * @returns 属性值，如果路径不存在则返回 undefined
 */
export function getNestedProperty(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object' || !path) {
    return undefined;
  }

  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' && key in current 
      ? current[key] 
      : undefined;
  }, obj);
}

/**
 * 设置嵌套属性值
 * @param obj 目标对象
 * @param path 属性路径，支持点分隔的嵌套路径 (如 "transform.position.x")
 * @param value 要设置的值
 */
export function setNestedProperty(obj: any, path: string, value: any): void {
  if (!obj || typeof obj !== 'object' || !path) {
    return;
  }

  const keys = path.split('.');
  const lastKey = keys.pop()!;
  
  // 导航到最后一级对象，自动创建中间对象
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);

  target[lastKey] = value;
}

/**
 * 类型安全的嵌套属性获取
 * @param obj 目标对象
 * @param path 属性路径
 * @returns 类型安全的属性值
 */
export function getNestedPropertySafe<T>(
  obj: Record<string, any>, 
  path: string
): T | undefined {
  return getNestedProperty(obj, path) as T | undefined;
}

/**
 * 检查对象是否有指定的嵌套属性
 * @param obj 目标对象
 * @param path 属性路径
 * @returns 是否存在该属性
 */
export function hasNestedProperty(obj: any, path: string): boolean {
  if (!obj || typeof obj !== 'object' || !path) {
    return false;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  return true;
}

/**
 * 删除嵌套属性
 * @param obj 目标对象
 * @param path 属性路径
 * @returns 是否成功删除
 */
export function deleteNestedProperty(obj: any, path: string): boolean {
  if (!obj || typeof obj !== 'object' || !path) {
    return false;
  }

  const keys = path.split('.');
  const lastKey = keys.pop()!;

  // 导航到父级对象
  let current = obj;
  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  if (current && typeof current === 'object' && lastKey in current) {
    delete current[lastKey];
    return true;
  }

  return false;
}

/**
 * 深度克隆对象
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export function deepClone<T>(obj: T, visited = new WeakMap()): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 处理循环引用
  if (visited.has(obj as any)) {
    throw new Error('Circular reference detected');
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    visited.set(obj as any, true);
    const result = obj.map(item => deepClone(item, visited)) as T;
    visited.delete(obj as any);
    return result;
  }

  if (typeof obj === 'object') {
    visited.set(obj as any, true);
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key], visited);
      }
    }
    visited.delete(obj as any);
    return cloned;
  }

  return obj;
}

/**
 * 合并对象，支持嵌套合并
 * @param target 目标对象
 * @param sources 源对象
 * @returns 合并后的对象
 */
export function deepMerge<T extends Record<string, any>>(
  target: T, 
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key] as T, source[key] as Partial<T>);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * 检查是否为对象
 * @param item 待检查项
 * @returns 是否为对象
 */
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 获取对象的所有路径
 * @param obj 目标对象
 * @param prefix 路径前缀
 * @returns 所有属性路径数组
 */
export function getObjectPaths(obj: any, prefix: string = ''): string[] {
  const paths: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return paths;
  }

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // 递归处理嵌套对象，只收集叶子节点路径
        paths.push(...getObjectPaths(obj[key], currentPath));
      } else {
        // 叶子节点（非对象值）才添加到路径列表
        paths.push(currentPath);
      }
    }
  }

  return paths;
}

/**
 * 比较两个对象的指定路径值是否相等
 * @param obj1 对象1
 * @param obj2 对象2
 * @param path 属性路径
 * @returns 是否相等
 */
export function compareNestedProperty(obj1: any, obj2: any, path: string): boolean {
  const value1 = getNestedProperty(obj1, path);
  const value2 = getNestedProperty(obj2, path);
  return value1 === value2;
}